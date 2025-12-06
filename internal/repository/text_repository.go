package repository

import (
	"context"

	"collaborative-editor/pkg/text"
)

// TextRepository defines the interface for text storage operations
type TextRepository interface {
	Save(ctx context.Context, t *text.Text) error
	GetByID(ctx context.Context, textID string) (*text.Text, error)
	GetByUserID(ctx context.Context, userID string) (*text.Text, error)
}
