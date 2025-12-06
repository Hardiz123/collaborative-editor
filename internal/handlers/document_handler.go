package handlers

import (
	"encoding/json"
	"net/http"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/middleware"
	"collaborative-editor/internal/services"
)

// DocumentHandler handles HTTP requests for document operations
type DocumentHandler struct {
	docService *services.DocumentService
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(docService *services.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		docService: docService,
	}
}

// CreateDocument handles creating a new document
func (h *DocumentHandler) CreateDocument(w http.ResponseWriter, r *http.Request) {
	var req services.CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	doc, err := h.docService.CreateDocument(r.Context(), userID, &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusCreated, doc)
}

// GetDocument handles retrieving a document
func (h *DocumentHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	docID := r.PathValue("id")

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	doc, err := h.docService.GetDocument(r.Context(), userID, docID)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, doc)
}

// UpdateDocument handles updating a document
func (h *DocumentHandler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	docID := r.PathValue("id")

	var req services.CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	doc, err := h.docService.UpdateDocument(r.Context(), userID, docID, &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, doc)
}

// DeleteDocument handles deleting a document
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	docID := r.PathValue("id")

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	if err := h.docService.DeleteDocument(r.Context(), userID, docID); err != nil {
		respondWithError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddCollaborator handles adding a collaborator
func (h *DocumentHandler) AddCollaborator(w http.ResponseWriter, r *http.Request) {
	docID := r.PathValue("id")

	var req services.AddCollaboratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	doc, err := h.docService.AddCollaborator(r.Context(), userID, docID, &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, doc)
}

// ListDocuments handles listing documents for a user
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	docs, err := h.docService.ListDocuments(r.Context(), userID)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, docs)
}
