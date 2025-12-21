package sharedlink

import "time"

// SharedLink represents a shareable link for a document
type SharedLink struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"document_id"`
	Permission string    `json:"permission"` // "read", "edit"
	ExpiresAt  time.Time `json:"expires_at"` // Optional
	CreatedAt  time.Time `json:"created_at"`
}

// NewSharedLink creates a new shared link instance
func NewSharedLink(id, documentID, permission string, expiresAt time.Time) *SharedLink {
	return &SharedLink{
		ID:         id,
		DocumentID: documentID,
		Permission: permission,
		ExpiresAt:  expiresAt,
		CreatedAt:  time.Now(),
	}
}
