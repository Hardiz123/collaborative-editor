package repository

import (
	"context"
	"errors"
	"fmt"

	"collaborative-editor/internal/db"
	"collaborative-editor/pkg/user"

	"github.com/couchbase/gocb/v2"
)

// CouchbaseUserRepository implements UserRepository using Couchbase
type CouchbaseUserRepository struct{}

// NewCouchbaseUserRepository creates a new Couchbase user repository
func NewCouchbaseUserRepository() *CouchbaseUserRepository {
	return &CouchbaseUserRepository{}
}

// Create stores a new user in Couchbase
// Uses UserDocument to ensure PasswordHash is stored in the database
func (r *CouchbaseUserRepository) Create(ctx context.Context, u *user.User) error {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("user:%s", u.ID)

	// Convert to UserDocument to ensure PasswordHash is included in storage
	doc := u.ToDocument()

	_, err := collection.Insert(documentID, doc, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by their ID
func (r *CouchbaseUserRepository) GetByID(ctx context.Context, userID string) (*user.User, error) {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("user:%s", userID)

	// Use UserDocument to retrieve password_hash from database
	var doc user.UserDocument
	getResult, err := collection.Get(documentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if err := getResult.Content(&doc); err != nil {
		return nil, fmt.Errorf("failed to decode user: %w", err)
	}

	// Convert UserDocument back to User
	return user.FromDocument(&doc), nil
}

// GetByEmail retrieves a user by their email
func (r *CouchbaseUserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	query := fmt.Sprintf(
		"SELECT META().id as id, u.* FROM `%s`.`%s`.`%s` u WHERE u.email = $1 LIMIT 1",
		db.GetBucketName(),
		db.GetScopeName(),
		db.GetCollectionName(),
	)

	scope := db.GetScope()
	queryResult, err := scope.Query(
		query,
		&gocb.QueryOptions{
			PositionalParameters: []interface{}{email},
			Context:              ctx,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}
	defer queryResult.Close()

	// The query returns fields directly, not nested under "u"
	var doc user.UserDocument

	if queryResult.Next() {
		err := queryResult.Row(&doc)
		if err != nil {
			return nil, fmt.Errorf("failed to parse query result: %w", err)
		}
		// Convert UserDocument to User
		if result := user.FromDocument(&doc); result != nil {
			return result, nil
		}
		return nil, fmt.Errorf("failed to convert document to user")
	}

	return nil, fmt.Errorf("user not found")
}

// GetByUsername retrieves a user by their username
func (r *CouchbaseUserRepository) GetByUsername(ctx context.Context, username string) (*user.User, error) {
	query := fmt.Sprintf(
		"SELECT META().id as id, u.* FROM `%s`.`%s`.`%s` u WHERE u.username = $1 LIMIT 1",
		db.GetBucketName(),
		db.GetScopeName(),
		db.GetCollectionName(),
	)

	scope := db.GetScope()
	queryResult, err := scope.Query(
		query,
		&gocb.QueryOptions{
			PositionalParameters: []interface{}{username},
			Context:              ctx,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query user by username: %w", err)
	}
	defer queryResult.Close()

	// The query returns fields directly, not nested under "u"
	var doc user.UserDocument

	if queryResult.Next() {
		err := queryResult.Row(&doc)
		if err != nil {
			return nil, fmt.Errorf("failed to parse query result: %w", err)
		}
		// Convert UserDocument to User
		if result := user.FromDocument(&doc); result != nil {
			return result, nil
		}
		return nil, fmt.Errorf("failed to convert document to user")
	}

	return nil, fmt.Errorf("user not found")
}

// Update updates an existing user in Couchbase
func (r *CouchbaseUserRepository) Update(ctx context.Context, u *user.User) error {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("user:%s", u.ID)

	// Convert to UserDocument to ensure PasswordHash is included in storage
	doc := u.ToDocument()

	_, err := collection.Replace(documentID, doc, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// Delete removes a user from Couchbase
func (r *CouchbaseUserRepository) Delete(ctx context.Context, userID string) error {
	collection := db.GetCollection("users")

	documentID := fmt.Sprintf("user:%s", userID)

	_, err := collection.Remove(documentID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}
