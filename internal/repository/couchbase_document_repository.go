package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

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
		"SELECT d.id, d.title, d.owner_id, d.collaborator_ids, d.created_at, d.updated_at FROM `%s`.`documents`.`documents` d WHERE d.owner_id = $1 OR ARRAY_CONTAINS(d.collaborator_ids, $1) ORDER BY d.updated_at DESC",
		db.GetBucketName(),
	)

	scope := db.GetDocumentsScope()
	rows, err := scope.Query(query, &gocb.QueryOptions{
		PositionalParameters: []any{userID},
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

// GetMetadataByID retrieves only document metadata fields, bypassing the heavy Content field
func (r *CouchbaseDocumentRepository) GetMetadataByID(ctx context.Context, id string) (*document.Document, error) {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", id)

	ops := []gocb.LookupInSpec{
		gocb.GetSpec("owner_id", nil),
		gocb.GetSpec("collaborator_ids", nil),
		gocb.GetSpec("title", nil),
		gocb.GetSpec("created_at", nil),
		gocb.GetSpec("updated_at", nil),
	}

	result, err := collection.LookupIn(documentID, ops, &gocb.LookupInOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to lookup document metadata: %w", err)
	}

	var docDoc document.DocumentDocument
	docDoc.ID = id

	var ownerID string
	if err := result.ContentAt(0, &ownerID); err == nil {
		docDoc.OwnerID = ownerID
	}
	var collaboratorIDs []string
	if err := result.ContentAt(1, &collaboratorIDs); err == nil {
		docDoc.CollaboratorIDs = collaboratorIDs
	}
	var title string
	if err := result.ContentAt(2, &title); err == nil {
		docDoc.Title = title
	}
	var createdAt time.Time
	if err := result.ContentAt(3, &createdAt); err == nil {
		docDoc.CreatedAt = createdAt
	}
	var updatedAt time.Time
	if err := result.ContentAt(4, &updatedAt); err == nil {
		docDoc.UpdatedAt = updatedAt
	}

	return document.FromDocument(&docDoc), nil
}

// AddCollaboratorID appends a collaborator ID to the document's collaborator_ids array atomically using Sub-Doc MutateIn
func (r *CouchbaseDocumentRepository) AddCollaboratorID(ctx context.Context, id string, collaboratorID string) error {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", id)

	ops := []gocb.MutateInSpec{
		// ArrayAddUnique adds the value to the array if it doesn't already exist
		gocb.ArrayAddUniqueSpec("collaborator_ids", collaboratorID, nil),
		gocb.UpsertSpec("updated_at", time.Now(), nil),
	}

	_, err := collection.MutateIn(documentID, ops, &gocb.MutateInOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to add collaborator via sub-doc: %w", err)
	}

	return nil
}

// UpdateFields updates selected fields of a document atomically using Sub-Doc MutateIn
func (r *CouchbaseDocumentRepository) UpdateFields(ctx context.Context, id string, title *string, content *string) error {
	collection := db.GetDocumentsCollection()
	documentID := fmt.Sprintf("doc:%s", id)

	var ops []gocb.MutateInSpec
	if title != nil {
		ops = append(ops, gocb.UpsertSpec("title", *title, nil))
	}
	if content != nil {
		ops = append(ops, gocb.UpsertSpec("content", *content, nil))
	}

	if len(ops) == 0 {
		return nil
	}

	ops = append(ops, gocb.UpsertSpec("updated_at", time.Now(), nil))

	_, err := collection.MutateIn(documentID, ops, &gocb.MutateInOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update document fields: %w", err)
	}

	return nil
}

