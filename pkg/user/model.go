package user

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID           string    `json:"id" couchbase:"id"`
	Username     string    `json:"username" couchbase:"username"`
	Email        string    `json:"email" couchbase:"email"`
	PasswordHash string    `json:"-" couchbase:"password_hash"` // Excluded from JSON API responses but stored in DB
	CreatedAt    time.Time `json:"created_at" couchbase:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" couchbase:"updated_at"`
}

// NewUser creates a new user
func NewUser(username, email, passwordHash string) *User {
	return &User{
		ID:           uuid.New().String(),
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

// UserDocument represents the user as stored in Couchbase
// This ensures PasswordHash is included when storing to database
type UserDocument struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"` // Explicitly included for storage
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ToDocument converts User to UserDocument for database storage
func (u *User) ToDocument() *UserDocument {
	return &UserDocument{
		ID:           u.ID,
		Username:     u.Username,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}

// FromDocument creates a User from UserDocument
func FromDocument(doc *UserDocument) *User {
	return &User{
		ID:           doc.ID,
		Username:     doc.Username,
		Email:        doc.Email,
		PasswordHash: doc.PasswordHash,
		CreatedAt:    doc.CreatedAt,
		UpdatedAt:    doc.UpdatedAt,
	}
}
