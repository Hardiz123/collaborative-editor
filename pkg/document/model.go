package document

import (
	"time"

	"github.com/google/uuid"
)

// Document represents a collaborative document
type Document struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	OwnerID         string    `json:"owner_id"`
	CollaboratorIDs []string  `json:"collaborator_ids"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// NewDocument creates a new document instance
func NewDocument(title, content, ownerID string) *Document {
	return &Document{
		ID:              uuid.New().String(),
		Title:           title,
		Content:         content,
		OwnerID:         ownerID,
		CollaboratorIDs: []string{},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
}

// DocumentDocument represents the document as stored in Couchbase
type DocumentDocument struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Content         string    `json:"content"`
	OwnerID         string    `json:"owner_id"`
	CollaboratorIDs []string  `json:"collaborator_ids"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ToDocument converts Document to DocumentDocument for database storage
func (d *Document) ToDocument() *DocumentDocument {
	return &DocumentDocument{
		ID:              d.ID,
		Title:           d.Title,
		Content:         d.Content,
		OwnerID:         d.OwnerID,
		CollaboratorIDs: d.CollaboratorIDs,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}

// FromDocument creates a Document from DocumentDocument
func FromDocument(doc *DocumentDocument) *Document {
	if doc == nil {
		return nil
	}
	return &Document{
		ID:              doc.ID,
		Title:           doc.Title,
		Content:         doc.Content,
		OwnerID:         doc.OwnerID,
		CollaboratorIDs: doc.CollaboratorIDs,
		CreatedAt:       doc.CreatedAt,
		UpdatedAt:       doc.UpdatedAt,
	}
}
