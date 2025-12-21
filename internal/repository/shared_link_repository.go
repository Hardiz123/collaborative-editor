package repository

import (
	"context"

	"collaborative-editor/pkg/sharedlink"
)

// SharedLinkRepository defines the interface for shared link storage operations
type SharedLinkRepository interface {
	Create(ctx context.Context, link *sharedlink.SharedLink) error
	GetByID(ctx context.Context, id string) (*sharedlink.SharedLink, error)
}
