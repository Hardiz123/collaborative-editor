package repository

import (
	"context"
	"errors"
	"fmt"

	"collaborative-editor/internal/db"
	"collaborative-editor/pkg/text"

	"github.com/couchbase/gocb/v2"
)

// CouchbaseTextRepository implements TextRepository using Couchbase
type CouchbaseTextRepository struct{}

// NewCouchbaseTextRepository creates a new Couchbase text repository
func NewCouchbaseTextRepository() *CouchbaseTextRepository {
	return &CouchbaseTextRepository{}
}

// Save stores or updates a text document in Couchbase
func (r *CouchbaseTextRepository) Save(ctx context.Context, t *text.Text) error {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("text:%s", t.ID)

	// Convert to TextDocument for storage
	doc := t.ToDocument()

	// Use Upsert to insert or update
	_, err := collection.Upsert(documentID, doc, &gocb.UpsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to save text: %w", err)
	}

	return nil
}

// GetByID retrieves a text document by its ID
func (r *CouchbaseTextRepository) GetByID(ctx context.Context, textID string) (*text.Text, error) {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("text:%s", textID)

	var doc text.TextDocument
	getResult, err := collection.Get(documentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, fmt.Errorf("text not found")
		}
		return nil, fmt.Errorf("failed to get text: %w", err)
	}

	if err := getResult.Content(&doc); err != nil {
		return nil, fmt.Errorf("failed to decode text: %w", err)
	}

	// Convert TextDocument back to Text
	return text.FromDocument(&doc), nil
}

// GetByUserID retrieves a text document by user ID
func (r *CouchbaseTextRepository) GetByUserID(ctx context.Context, userID string) (*text.Text, error) {
	query := fmt.Sprintf(
		"SELECT META().id as id, t.* FROM `%s`.`%s`.`%s` t WHERE t.user_id = $1 AND META().id LIKE 'text:%%' LIMIT 1",
		db.GetBucketName(),
		db.GetScopeName(),
		db.GetCollectionName(),
	)

	scope := db.GetScope()
	queryResult, err := scope.Query(
		query,
		&gocb.QueryOptions{
			PositionalParameters: []interface{}{userID},
			Context:              ctx,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query text by user ID: %w", err)
	}
	defer queryResult.Close()

	var doc text.TextDocument

	if queryResult.Next() {
		err := queryResult.Row(&doc)
		if err != nil {
			return nil, fmt.Errorf("failed to parse query result: %w", err)
		}
		// Convert TextDocument to Text
		if result := text.FromDocument(&doc); result != nil {
			return result, nil
		}
		return nil, fmt.Errorf("failed to convert document to text")
	}

	return nil, fmt.Errorf("text not found")
}

