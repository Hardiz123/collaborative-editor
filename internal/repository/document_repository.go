package repository

import (
	"context"

	"collaborative-editor/pkg/document"
)

// DocumentRepository defines the interface for document storage operations
type DocumentRepository interface {
	Create(ctx context.Context, doc *document.Document) error
	GetByID(ctx context.Context, id string) (*document.Document, error)
	GetMetadataByID(ctx context.Context, id string) (*document.Document, error)
	Update(ctx context.Context, doc *document.Document) error
	UpdateFields(ctx context.Context, id string, title *string, content *string) error
	AddCollaboratorID(ctx context.Context, id string, collaboratorID string) error
	Delete(ctx context.Context, id string) error
	ListByUserID(ctx context.Context, userID string) ([]*document.Document, error)
}
