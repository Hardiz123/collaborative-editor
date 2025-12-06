package repository

import (
	"context"
	"errors"
	"fmt"

	"collaborative-editor/internal/db"
	"collaborative-editor/pkg/document"

	"github.com/couchbase/gocb/v2"
)

// CouchbaseDocumentRepository implements DocumentRepository using Couchbase
type CouchbaseDocumentRepository struct{}

// NewCouchbaseDocumentRepository creates a new Couchbase document repository
func NewCouchbaseDocumentRepository() *CouchbaseDocumentRepository {
	return &CouchbaseDocumentRepository{}
}

// Create stores a new document in Couchbase
func (r *CouchbaseDocumentRepository) Create(ctx context.Context, doc *document.Document) error {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", doc.ID)

	docDoc := doc.ToDocument()

	_, err := collection.Insert(documentID, docDoc, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to insert document: %w", err)
	}

	return nil
}

// GetByID retrieves a document by its ID
func (r *CouchbaseDocumentRepository) GetByID(ctx context.Context, id string) (*document.Document, error) {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", id)

	result, err := collection.Get(documentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	var docDoc document.DocumentDocument
	if err := result.Content(&docDoc); err != nil {
		return nil, fmt.Errorf("failed to decode document: %w", err)
	}

	return document.FromDocument(&docDoc), nil
}

// Update updates an existing document
func (r *CouchbaseDocumentRepository) Update(ctx context.Context, doc *document.Document) error {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", doc.ID)

	docDoc := doc.ToDocument()

	_, err := collection.Replace(documentID, docDoc, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}

	return nil
}

// Delete removes a document
func (r *CouchbaseDocumentRepository) Delete(ctx context.Context, id string) error {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", id)

	_, err := collection.Remove(documentID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	return nil
}

// ListByUserID retrieves all documents where the user is an owner or collaborator
func (r *CouchbaseDocumentRepository) ListByUserID(ctx context.Context, userID string) ([]*document.Document, error) {
	query := fmt.Sprintf(
		"SELECT d.* FROM `%s`.`documents`.`documents` d WHERE d.owner_id = $1 OR ARRAY_CONTAINS(d.collaborator_ids, $1)",
		db.GetBucketName(),
	)

	scope := db.GetDocumentsScope()
	rows, err := scope.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{userID},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query documents: %w", err)
	}
	defer rows.Close()

	var documents []*document.Document
	for rows.Next() {
		var docDoc document.DocumentDocument
		if err := rows.Row(&docDoc); err != nil {
			return nil, fmt.Errorf("failed to parse document row: %w", err)
		}
		documents = append(documents, document.FromDocument(&docDoc))
	}

	return documents, nil
}
