package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"collaborative-editor/internal/db"

	"github.com/couchbase/gocb/v2"
)

// BlacklistedToken represents a blacklisted token document
type BlacklistedToken struct {
	TokenHash     string    `json:"token_hash"`
	ExpiresAt     time.Time `json:"expires_at"`
	BlacklistedAt time.Time `json:"blacklisted_at"`
}

// CouchbaseTokenBlacklistRepository implements TokenBlacklistRepository using Couchbase
type CouchbaseTokenBlacklistRepository struct{}

// NewCouchbaseTokenBlacklistRepository creates a new Couchbase token blacklist repository
func NewCouchbaseTokenBlacklistRepository() *CouchbaseTokenBlacklistRepository {
	return &CouchbaseTokenBlacklistRepository{}
}

// hashToken creates a SHA256 hash of the token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// AddToken adds a token to the blacklist with its expiration time
// Uses Couchbase document expiration (TTL) to automatically delete expired tokens
func (r *CouchbaseTokenBlacklistRepository) AddToken(ctx context.Context, token string, expiresAt time.Time) error {
	collection := db.GetBlacklistCollection()

	tokenHash := hashToken(token)
	documentID := fmt.Sprintf("blacklist:%s", tokenHash)

	blacklistedToken := BlacklistedToken{
		TokenHash:     tokenHash,
		ExpiresAt:     expiresAt,
		BlacklistedAt: time.Now(),
	}

	// Calculate TTL duration until token expiration
	// Add a small buffer (1 hour) to ensure token is removed after expiration
	now := time.Now()
	ttlDuration := expiresAt.Sub(now) + time.Hour
	if ttlDuration < 0 {
		// Token already expired, no need to blacklist
		return nil
	}

	// Use upsert with expiration to automatically delete when token expires
	// Couchbase will automatically delete the document after the expiry duration
	_, err := collection.Upsert(documentID, blacklistedToken, &gocb.UpsertOptions{
		Context: ctx,
		Expiry:  ttlDuration,
	})
	if err != nil {
		return fmt.Errorf("failed to add token to blacklist: %w", err)
	}

	return nil
}

// IsTokenBlacklisted checks if a token is in the blacklist
// Couchbase automatically removes expired documents, so if document exists, token is blacklisted
func (r *CouchbaseTokenBlacklistRepository) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	collection := db.GetBlacklistCollection()

	tokenHash := hashToken(token)
	documentID := fmt.Sprintf("blacklist:%s", tokenHash)

	// Try to get the document - if it exists, token is blacklisted
	// Couchbase will automatically return ErrDocumentNotFound if document expired (TTL)
	_, err := collection.Get(documentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return false, nil // Token is not blacklisted (or has expired and been auto-deleted)
		}
		return false, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	// Document exists, token is blacklisted
	return true, nil
}

// RemoveExpiredTokens removes expired tokens from the blacklist
// NOTE: This is optional since Couchbase automatically deletes documents when their TTL expires.
// This method can be used for manual cleanup or to remove tokens that expired before TTL was implemented.
func (r *CouchbaseTokenBlacklistRepository) RemoveExpiredTokens(ctx context.Context) error {
	scope := db.GetBlacklistScope()

	// Query to find all expired tokens
	query := fmt.Sprintf(
		"SELECT META().id as id FROM `%s`.`%s`.`%s` WHERE expires_at < $1",
		db.GetBucketName(),
		"blacklist",
		"tokens",
	)

	queryResult, err := scope.Query(
		query,
		&gocb.QueryOptions{
			PositionalParameters: []interface{}{time.Now()},
			Context:              ctx,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to query expired tokens: %w", err)
	}
	defer queryResult.Close()

	collection := db.GetBlacklistCollection()
	removedCount := 0

	for queryResult.Next() {
		var result struct {
			ID string `json:"id"`
		}
		if err := queryResult.Row(&result); err != nil {
			continue
		}

		// Remove the expired token
		_, err := collection.Remove(result.ID, &gocb.RemoveOptions{
			Context: ctx,
		})
		if err != nil && !errors.Is(err, gocb.ErrDocumentNotFound) {
			// Log error but continue with other tokens
			fmt.Printf("Failed to remove expired token %s: %v\n", result.ID, err)
		} else {
			removedCount++
		}
	}

	if removedCount > 0 {
		fmt.Printf("Removed %d expired tokens from blacklist\n", removedCount)
	}

	return nil
}
