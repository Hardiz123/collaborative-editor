package repository

import (
	"context"

	"collaborative-editor/pkg/user"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(ctx context.Context, u *user.User) error
	GetByID(ctx context.Context, userID string) (*user.User, error)
	GetByEmail(ctx context.Context, email string) (*user.User, error)
	GetByUsername(ctx context.Context, username string) (*user.User, error)
	Update(ctx context.Context, u *user.User) error
	Delete(ctx context.Context, userID string) error
}
