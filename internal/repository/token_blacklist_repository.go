package repository

import (
	"context"
	"time"
)

// TokenBlacklistRepository defines the interface for token blacklist operations
type TokenBlacklistRepository interface {
	// AddToken adds a token to the blacklist with its expiration time
	// The repository will hash the token internally for storage
	AddToken(ctx context.Context, token string, expiresAt time.Time) error

	// IsTokenBlacklisted checks if a token is in the blacklist
	// The repository will hash the token internally for lookup
	IsTokenBlacklisted(ctx context.Context, token string) (bool, error)

	// RemoveExpiredTokens removes expired tokens from the blacklist (cleanup operation)
	RemoveExpiredTokens(ctx context.Context) error
}
