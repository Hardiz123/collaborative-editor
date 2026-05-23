package services

import (
	"context"
	"fmt"
	"log"
	"slices"
	"strings"
	"time"

	"collaborative-editor/internal/auth"
	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/middleware"
	"collaborative-editor/internal/repository"
	"collaborative-editor/pkg/document"
	"collaborative-editor/pkg/sharedlink"
	"collaborative-editor/pkg/user"

	"github.com/google/uuid"
)

// DocumentService handles document-related business logic
type DocumentService struct {
	docRepo  repository.DocumentRepository
	userRepo repository.UserRepository
	linkRepo repository.SharedLinkRepository
}

// NewDocumentService creates a new document service
func NewDocumentService(docRepo repository.DocumentRepository, userRepo repository.UserRepository, linkRepo repository.SharedLinkRepository) *DocumentService {
	return &DocumentService{
		docRepo:  docRepo,
		userRepo: userRepo,
		linkRepo: linkRepo,
	}
}

// CreateDocumentRequest represents a request to create a document
type CreateDocumentRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// UpdateDocumentRequest represents a request to update a document (with optional fields)
type UpdateDocumentRequest struct {
	Title   *string `json:"title,omitempty"`
	Content *string `json:"content,omitempty"`
}

// AddCollaboratorRequest represents a request to add a collaborator
type AddCollaboratorRequest struct {
	Email string `json:"email"`
}

// DocumentResponse represents a document response
type DocumentResponse struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Content         string    `json:"content,omitempty"`
	OwnerID         string    `json:"owner_id"`
	CollaboratorIDs []string  `json:"collaborator_ids"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// CreateSharedLinkRequest represents a request to create a shared link
type CreateSharedLinkRequest struct {
	Permission string `json:"permission"` // "read", "edit"
}

// SharedLinkResponse represents a shared link response
type SharedLinkResponse struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"document_id"`
	Permission string    `json:"permission"`
	ExpiresAt  time.Time `json:"expires_at"`
	URL        string    `json:"url"` // Full URL to frontend
}

// AccessSharedLinkResponse represents response for accessing a shared link
type AccessSharedLinkResponse struct {
	AccessToken string `json:"access_token"`
	DocumentID  string `json:"document_id"`
	Permission  string `json:"permission"`
}

// CreateDocument creates a new document
func (s *DocumentService) CreateDocument(ctx context.Context, userID string, req *CreateDocumentRequest) (*DocumentResponse, error) {
	if req.Title == "" {
		return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "Title is required", nil)
	}

	doc := document.NewDocument(req.Title, req.Content, userID)

	if err := s.docRepo.Create(ctx, doc); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to create document: %w", err))
	}

	return s.toResponse(doc), nil
}

// GetDocument retrieves a document if the user has access
func (s *DocumentService) GetDocument(ctx context.Context, userID, docID string) (*DocumentResponse, error) {
	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	if !s.checkAccess(ctx, doc, userID, false) {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
	}

	return s.toResponse(doc), nil
}

// UpdateDocument updates a document if the user has access
func (s *DocumentService) UpdateDocument(ctx context.Context, userID, docID string, req *UpdateDocumentRequest) (*DocumentResponse, error) {
	// Fetch metadata only to check access, avoiding fetching the heavy content field
	doc, err := s.docRepo.GetMetadataByID(ctx, docID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	if !s.checkAccess(ctx, doc, userID, true) {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
	}

	// Update only the provided fields in the database
	if err := s.docRepo.UpdateFields(ctx, docID, req.Title, req.Content); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to update document fields: %w", err))
	}

	// Build the response (Content is intentionally omitted so it doesn't inflate response size)
	resp := &DocumentResponse{
		ID:              doc.ID,
		Title:           doc.Title,
		OwnerID:         doc.OwnerID,
		CollaboratorIDs: doc.CollaboratorIDs,
		CreatedAt:       doc.CreatedAt,
		UpdatedAt:       time.Now(),
	}

	if req.Title != nil {
		resp.Title = *req.Title
	}

	return resp, nil
}

// DeleteDocument deletes a document (only owner)
func (s *DocumentService) DeleteDocument(ctx context.Context, userID, docID string) error {
	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return errors.WrapError(errors.ErrInternalServer, err)
	}

	if doc.OwnerID != userID {
		return errors.NewAppError(errors.ErrForbidden.Code, "Only owner can delete document", nil)
	}

	if err := s.docRepo.Delete(ctx, docID); err != nil {
		return errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to delete document: %w", err))
	}

	return nil
}

// AddCollaborator adds a collaborator to a document (only owner)
func (s *DocumentService) AddCollaborator(ctx context.Context, userID, docID string, req *AddCollaboratorRequest) (*DocumentResponse, error) {
	if req.Email == "" {
		return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "Email is required", nil)
	}

	// Run document retrieval and collaborator retrieval in parallel to minimize latency
	type docResult struct {
		doc *document.Document
		err error
	}
	type userResult struct {
		user *user.User
		err  error
	}

	docChan := make(chan docResult, 1)
	userChan := make(chan userResult, 1)

	go func() {
		start := time.Now()
		doc, err := s.docRepo.GetMetadataByID(ctx, docID)
		log.Printf("[AddCollaborator] docRepo.GetMetadataByID (concurrent) took: %v", time.Since(start))
		docChan <- docResult{doc: doc, err: err}
	}()

	go func() {
		start := time.Now()
		collaborator, err := s.userRepo.GetByEmail(ctx, req.Email)
		log.Printf("[AddCollaborator] userRepo.GetByEmail (concurrent) took: %v", time.Since(start))
		userChan <- userResult{user: collaborator, err: err}
	}()

	// Wait for both results
	dRes := <-docChan
	uRes := <-userChan

	if dRes.err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, dRes.err)
	}
	doc := dRes.doc

	if doc.OwnerID != userID {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Only owner can add collaborators", nil)
	}

	if uRes.err != nil {
		return nil, errors.NewAppError(errors.ErrNotFound.Code, "User not found with this email", nil)
	}
	collaborator := uRes.user

	if collaborator.ID == doc.OwnerID {
		return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "Owner is already a collaborator", nil)
	}

	// Check if already a collaborator
	for _, id := range doc.CollaboratorIDs {
		if id == collaborator.ID {
			return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "User is already a collaborator", nil)
		}
	}

	// Add collaborator via atomic sub-doc mutate
	updateStart := time.Now()
	err := s.docRepo.AddCollaboratorID(ctx, docID, collaborator.ID)
	log.Printf("[AddCollaborator] docRepo.AddCollaboratorID took: %v", time.Since(updateStart))
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	// Update local struct state to formulate final response
	doc.CollaboratorIDs = append(doc.CollaboratorIDs, collaborator.ID)
	doc.UpdatedAt = time.Now()

	resp := s.toResponse(doc)
	resp.Content = "" // Strip the heavy content for the collaborator response
	return resp, nil
}

// ListDocuments lists documents for a user
func (s *DocumentService) ListDocuments(ctx context.Context, userID string) ([]*DocumentResponse, error) {
	docs, err := s.docRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to list documents: %w", err))
	}

	var responses []*DocumentResponse
	for _, doc := range docs {
		responses = append(responses, s.toResponse(doc))
	}

	return responses, nil
}

// CreateSharedLink creates a shareable link for a document
func (s *DocumentService) CreateSharedLink(ctx context.Context, userID, docID string, req *CreateSharedLinkRequest) (*SharedLinkResponse, error) {
	// Verify document exists and user is owner
	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	if doc.OwnerID != userID {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Only owner can share document", nil)
	}

	// Validate permission
	if req.Permission != "read" && req.Permission != "edit" {
		return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "Invalid permission. Must be 'read' or 'edit'", nil)
	}

	// Create link
	id := uuid.New().String()
	// Default expiration: 7 days
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	link := sharedlink.NewSharedLink(id, docID, req.Permission, expiresAt)

	if err := s.linkRepo.Create(ctx, link); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to create shared link: %w", err))
	}

	// Construct URL (In production this should be from config)
	url := fmt.Sprintf("/shared/%s", id)

	return &SharedLinkResponse{
		ID:         link.ID,
		DocumentID: link.DocumentID,
		Permission: link.Permission,
		ExpiresAt:  link.ExpiresAt,
		URL:        url,
	}, nil
}

// AccessSharedLink validates a shared link and returns an access token
func (s *DocumentService) AccessSharedLink(ctx context.Context, linkID string) (*AccessSharedLinkResponse, error) {
	link, err := s.linkRepo.GetByID(ctx, linkID)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrNotFound.Code, "Shared link not found", nil)
	}

	// Check expiration
	if time.Now().After(link.ExpiresAt) {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Shared link has expired", nil)
	}

	// Generate Guest Token
	guestID := "guest-" + uuid.New().String()
	token, err := auth.GenerateGuestToken(guestID, "Guest User", link.DocumentID, link.Permission)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to generate guest token: %w", err))
	}

	return &AccessSharedLinkResponse{
		AccessToken: token,
		DocumentID:  link.DocumentID,
		Permission:  link.Permission,
	}, nil
}

// Helper: check access
func (s *DocumentService) checkAccess(ctx context.Context, doc *document.Document, userID string, requireEdit bool) bool {
	// Guest Access
	if strings.HasPrefix(userID, "guest-") {
		tokenDocID := middleware.GetDocumentID(ctx)
		tokenPerm := middleware.GetPermission(ctx)

		if tokenDocID != doc.ID {
			return false
		}

		if requireEdit && tokenPerm != "edit" {
			return false
		}

		return tokenPerm == "read" || tokenPerm == "edit"
	}

	// Standard User Access
	if doc.OwnerID == userID {
		return true
	}
	return slices.Contains(doc.CollaboratorIDs, userID)
}

// Helper: convert to response
func (s *DocumentService) toResponse(doc *document.Document) *DocumentResponse {
	return &DocumentResponse{
		ID:              doc.ID,
		Title:           doc.Title,
		Content:         doc.Content,
		OwnerID:         doc.OwnerID,
		CollaboratorIDs: doc.CollaboratorIDs,
		CreatedAt:       doc.CreatedAt,
		UpdatedAt:       doc.UpdatedAt,
	}
}
