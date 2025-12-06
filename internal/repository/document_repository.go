package repository

import (
	"context"

	"collaborative-editor/pkg/document"
)

// DocumentRepository defines the interface for document storage operations
type DocumentRepository interface {
	Create(ctx context.Context, doc *document.Document) error
	GetByID(ctx context.Context, id string) (*document.Document, error)
	Update(ctx context.Context, doc *document.Document) error
	Delete(ctx context.Context, id string) error
	ListByUserID(ctx context.Context, userID string) ([]*document.Document, error)
}
