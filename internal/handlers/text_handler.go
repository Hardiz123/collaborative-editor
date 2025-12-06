package handlers

import (
	"encoding/json"
	"net/http"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/middleware"
	"collaborative-editor/internal/services"
)

// TextHandler handles HTTP requests for text operations
type TextHandler struct {
	textService *services.TextService
}

// NewTextHandler creates a new text handler
func NewTextHandler(textService *services.TextService) *TextHandler {
	return &TextHandler{
		textService: textService,
	}
}

// SaveText handles requests to save text
func (h *TextHandler) SaveText(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, errors.NewAppError(
			http.StatusMethodNotAllowed,
			"Method not allowed",
			nil,
		))
		return
	}

	var req services.SaveTextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	// Call service
	response, err := h.textService.SaveText(r.Context(), userID, &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, response)
}

// GetText handles requests to get text
func (h *TextHandler) GetText(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, errors.NewAppError(
			http.StatusMethodNotAllowed,
			"Method not allowed",
			nil,
		))
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		respondWithError(w, errors.ErrUnauthorized)
		return
	}

	// Call service
	response, err := h.textService.GetText(r.Context(), userID)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, response)
}

