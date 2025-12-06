package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/repository"
	"collaborative-editor/pkg/text"
)

// TextService handles text-related business logic
type TextService struct {
	textRepo repository.TextRepository
}

// NewTextService creates a new text service
func NewTextService(textRepo repository.TextRepository) *TextService {
	return &TextService{
		textRepo: textRepo,
	}
}

// SaveTextRequest represents a request to save text
type SaveTextRequest struct {
	Content string `json:"content"`
}

// SaveTextResponse represents a response after saving text
type SaveTextResponse struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	Message   string `json:"message"`
}

// GetTextResponse represents a response for getting text
type GetTextResponse struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// SaveText saves or updates text for a logged-in user
func (s *TextService) SaveText(ctx context.Context, userID string, req *SaveTextRequest) (*SaveTextResponse, error) {
	// Normalize input
	req.Content = strings.TrimSpace(req.Content)

	// Validate input
	if req.Content == "" {
		return nil, errors.NewAppError(
			errors.ErrInvalidInput.Code,
			"Content cannot be empty",
			nil,
		)
	}

	// Try to get existing text for this user
	existingText, err := s.textRepo.GetByUserID(ctx, userID)
	if err != nil {
		// If no existing text, create a new one
		newText := text.NewText(userID, req.Content)
		if err := s.textRepo.Save(ctx, newText); err != nil {
			return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to save text: %w", err))
		}

		return &SaveTextResponse{
			ID:        newText.ID,
			Content:   newText.Content,
			CreatedAt: newText.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: newText.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			Message:   "Text saved successfully",
		}, nil
	}

	// Update existing text
	existingText.Content = req.Content
	existingText.UpdatedAt = time.Now()
	if err := s.textRepo.Save(ctx, existingText); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to update text: %w", err))
	}

	return &SaveTextResponse{
		ID:        existingText.ID,
		Content:   existingText.Content,
		CreatedAt: existingText.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: existingText.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Message:   "Text updated successfully",
	}, nil
}

// GetText retrieves text for a logged-in user
func (s *TextService) GetText(ctx context.Context, userID string) (*GetTextResponse, error) {
	t, err := s.textRepo.GetByUserID(ctx, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, errors.NewAppError(
				errors.ErrNotFound.Code,
				"No text found for this user",
				nil,
			)
		}
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	return &GetTextResponse{
		ID:        t.ID,
		Content:   t.Content,
		CreatedAt: t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

