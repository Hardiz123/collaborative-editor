package services

import (
	"context"
	"fmt"
	"time"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/repository"
	"collaborative-editor/pkg/document"
)

// DocumentService handles document-related business logic
type DocumentService struct {
	docRepo  repository.DocumentRepository
	userRepo repository.UserRepository
}

// NewDocumentService creates a new document service
func NewDocumentService(docRepo repository.DocumentRepository, userRepo repository.UserRepository) *DocumentService {
	return &DocumentService{
		docRepo:  docRepo,
		userRepo: userRepo,
	}
}

// CreateDocumentRequest represents a request to create a document
type CreateDocumentRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// AddCollaboratorRequest represents a request to add a collaborator
type AddCollaboratorRequest struct {
	Email string `json:"email"`
}

// DocumentResponse represents a document response
type DocumentResponse struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	OwnerID         string    `json:"owner_id"`
	CollaboratorIDs []string  `json:"collaborator_ids"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
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

	if !s.hasAccess(doc, userID) {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
	}

	return s.toResponse(doc), nil
}

// UpdateDocument updates a document if the user has access
func (s *DocumentService) UpdateDocument(ctx context.Context, userID, docID string, req *CreateDocumentRequest) (*DocumentResponse, error) {
	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	if !s.hasAccess(doc, userID) {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
	}

	if req.Title != "" {
		doc.Title = req.Title
	}
	// Content update - in a real collaborative app, this would be more complex (OT/CRDT)
	// For now, we just overwrite
	doc.Content = req.Content
	doc.UpdatedAt = time.Now()

	if err := s.docRepo.Update(ctx, doc); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to update document: %w", err))
	}

	return s.toResponse(doc), nil
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

	doc, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	if doc.OwnerID != userID {
		return nil, errors.NewAppError(errors.ErrForbidden.Code, "Only owner can add collaborators", nil)
	}

	collaborator, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.NewAppError(errors.ErrNotFound.Code, "User not found with this email", nil)
	}

	if collaborator.ID == doc.OwnerID {
		return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "Owner is already a collaborator", nil)
	}

	// Check if already a collaborator
	for _, id := range doc.CollaboratorIDs {
		if id == collaborator.ID {
			return nil, errors.NewAppError(errors.ErrInvalidInput.Code, "User is already a collaborator", nil)
		}
	}

	doc.CollaboratorIDs = append(doc.CollaboratorIDs, collaborator.ID)
	doc.UpdatedAt = time.Now()

	if err := s.docRepo.Update(ctx, doc); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to update document: %w", err))
	}

	return s.toResponse(doc), nil
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

// Helper: check access
func (s *DocumentService) hasAccess(doc *document.Document, userID string) bool {
	if doc.OwnerID == userID {
		return true
	}
	for _, id := range doc.CollaboratorIDs {
		if id == userID {
			return true
		}
	}
	return false
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
