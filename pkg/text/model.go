package text

import (
	"time"

	"github.com/google/uuid"
)

// Text represents a text document in the system
type Text struct {
	ID        string    `json:"id" couchbase:"id"`
	UserID    string    `json:"user_id" couchbase:"user_id"`
	Content   string    `json:"content" couchbase:"content"`
	CreatedAt time.Time `json:"created_at" couchbase:"created_at"`
	UpdatedAt time.Time `json:"updated_at" couchbase:"updated_at"`
}

// NewText creates a new text document
func NewText(userID, content string) *Text {
	return &Text{
		ID:        uuid.New().String(),
		UserID:    userID,
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// TextDocument represents the text as stored in Couchbase
type TextDocument struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToDocument converts Text to TextDocument for database storage
func (t *Text) ToDocument() *TextDocument {
	return &TextDocument{
		ID:        t.ID,
		UserID:    t.UserID,
		Content:   t.Content,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}

// FromDocument creates a Text from TextDocument
func FromDocument(doc *TextDocument) *Text {
	if doc == nil {
		return nil
	}
	return &Text{
		ID:        doc.ID,
		UserID:    doc.UserID,
		Content:   doc.Content,
		CreatedAt: doc.CreatedAt,
		UpdatedAt: doc.UpdatedAt,
	}
}
