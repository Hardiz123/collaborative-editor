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
func (r *CouchbaseTokenBlacklistRepository) AddToken(ctx context.Context, token string, expiresAt time.Time) error {
	collection := db.GetBlacklistCollection()

	tokenHash := hashToken(token)
	documentID := fmt.Sprintf("blacklist:%s", tokenHash)

	blacklistedToken := BlacklistedToken{
		TokenHash:     tokenHash,
		ExpiresAt:     expiresAt,
		BlacklistedAt: time.Now(),
	}

	// Use upsert to handle case where token might already be blacklisted
	_, err := collection.Upsert(documentID, blacklistedToken, &gocb.UpsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to add token to blacklist: %w", err)
	}

	return nil
}

// IsTokenBlacklisted checks if a token is in the blacklist
func (r *CouchbaseTokenBlacklistRepository) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	collection := db.GetBlacklistCollection()

	tokenHash := hashToken(token)
	documentID := fmt.Sprintf("blacklist:%s", tokenHash)

	var blacklistedToken BlacklistedToken
	getResult, err := collection.Get(documentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return false, nil // Token is not blacklisted
		}
		return false, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	if err := getResult.Content(&blacklistedToken); err != nil {
		return false, fmt.Errorf("failed to decode blacklisted token: %w", err)
	}

	// Check if token has expired (cleanup check)
	if time.Now().After(blacklistedToken.ExpiresAt) {
		// Token has expired, remove it from blacklist
		_, _ = collection.Remove(documentID, &gocb.RemoveOptions{
			Context: ctx,
		})
		return false, nil
	}

	return true, nil
}

// RemoveExpiredTokens removes expired tokens from the blacklist
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
