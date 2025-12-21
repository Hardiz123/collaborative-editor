package repository

import (
	"context"
	"errors"
	"fmt"

	"collaborative-editor/internal/db"
	"collaborative-editor/pkg/sharedlink"

	"github.com/couchbase/gocb/v2"
)

// CouchbaseSharedLinkRepository implements SharedLinkRepository using Couchbase
type CouchbaseSharedLinkRepository struct{}

// NewCouchbaseSharedLinkRepository creates a new Couchbase shared link repository
func NewCouchbaseSharedLinkRepository() *CouchbaseSharedLinkRepository {
	return &CouchbaseSharedLinkRepository{}
}

// Create stores a new shared link in Couchbase
func (r *CouchbaseSharedLinkRepository) Create(ctx context.Context, link *sharedlink.SharedLink) error {
	collection := db.GetSharedLinksCollection()
	// key: "link:<id>"
	linkID := fmt.Sprintf("link:%s", link.ID)

	_, err := collection.Insert(linkID, link, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create shared link: %w", err)
	}

	return nil
}

// GetByID retrieves a shared link by its ID
func (r *CouchbaseSharedLinkRepository) GetByID(ctx context.Context, id string) (*sharedlink.SharedLink, error) {
	collection := db.GetSharedLinksCollection()
	linkID := fmt.Sprintf("link:%s", id)

	result, err := collection.Get(linkID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, fmt.Errorf("shared link not found")
		}
		return nil, fmt.Errorf("failed to get shared link: %w", err)
	}

	var link sharedlink.SharedLink
	if err := result.Content(&link); err != nil {
		return nil, fmt.Errorf("failed to decode shared link: %w", err)
	}

	return &link, nil
}
