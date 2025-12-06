package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/couchbase/gocb/v2"
)

var (
	cluster        *gocb.Cluster
	bucket         *gocb.Bucket
	bucketName     string
	scopeName      = "user"
	collectionName = "users"
)

// Connect initializes the Couchbase connection
func Connect() error {
	connectionString := os.Getenv("COUCHBASE_CONNECTION_STRING")
	username := os.Getenv("COUCHBASE_USERNAME")
	password := os.Getenv("COUCHBASE_PASSWORD")
	bucketName = os.Getenv("COUCHBASE_BUCKET_NAME")

	// Default to collab-editor if not set
	if bucketName == "" {
		bucketName = "collab-editor"
		log.Println("COUCHBASE_BUCKET_NAME not set, using default: collab-editor")
	}

	// Validate environment variables
	if connectionString == "" {
		return fmt.Errorf("COUCHBASE_CONNECTION_STRING environment variable is not set")
	}
	if username == "" {
		return fmt.Errorf("COUCHBASE_USERNAME environment variable is not set")
	}
	if password == "" {
		return fmt.Errorf("COUCHBASE_PASSWORD environment variable is not set")
	}

	// Connect to the cluster
	var err error
	cluster, err = gocb.Connect(connectionString, gocb.ClusterOptions{
		Authenticator: gocb.PasswordAuthenticator{
			Username: username,
			Password: password,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to Couchbase: %w", err)
	}

	// Wait for the cluster to be ready
	err = cluster.WaitUntilReady(10*time.Second, nil)
	if err != nil {
		return fmt.Errorf("failed to wait for cluster ready: %w", err)
	}

	// Open the bucket
	bucket = cluster.Bucket(bucketName)

	// Wait for the bucket to be ready
	err = bucket.WaitUntilReady(10*time.Second, nil)
	if err != nil {
		return fmt.Errorf("failed to wait for bucket ready: %w", err)
	}

	// Ensure user scope and collection exist
	if err := ensureScopeAndCollection(scopeName, collectionName); err != nil {
		return fmt.Errorf("failed to setup user scope and collection: %w", err)
	}

	// Ensure texts scope and collection exist
	if err := ensureScopeAndCollection("texts", "texts"); err != nil {
		return fmt.Errorf("failed to setup texts scope and collection: %w", err)
	}

	// Ensure blacklist scope and collection exist
	if err := ensureScopeAndCollection("blacklist", "tokens"); err != nil {
		return fmt.Errorf("failed to setup blacklist scope and collection: %w", err)
	}

	// Ensure documents scope and collection exist
	if err := ensureScopeAndCollection("documents", "documents"); err != nil {
		return fmt.Errorf("failed to setup documents scope and collection: %w", err)
	}

	log.Printf("Successfully connected to Couchbase bucket: %s", bucketName)
	return nil
}

// ensureScopeAndCollection checks if the scope exists, creates it if not, and ensures the collection exists
func ensureScopeAndCollection(scopeNameToCheck, collectionNameToCheck string) error {
	// Get bucket manager to manage scopes and collections
	bucketMgr := bucket.Collections()

	// Check if scope exists by trying to get it
	scopes, err := bucketMgr.GetAllScopes(nil)
	if err != nil {
		return fmt.Errorf("failed to get scopes: %w", err)
	}

	scopeExists := false
	for _, scope := range scopes {
		if scope.Name == scopeNameToCheck {
			scopeExists = true
			break
		}
	}

	// Create scope if it doesn't exist
	if !scopeExists {
		log.Printf("Creating scope '%s' in bucket '%s'", scopeNameToCheck, bucketName)
		err := bucketMgr.CreateScope(scopeNameToCheck, nil)
		if err != nil {
			// Scope might already exist (race condition), check error
			if !isScopeExistsError(err) {
				return fmt.Errorf("failed to create scope: %w", err)
			}
			log.Printf("Scope '%s' already exists", scopeNameToCheck)
		} else {
			log.Printf("Successfully created scope '%s'", scopeNameToCheck)
		}
	} else {
		log.Printf("Scope '%s' already exists", scopeNameToCheck)
	}

	// Check if collection exists
	collections, err := bucketMgr.GetAllScopes(nil)
	if err != nil {
		return fmt.Errorf("failed to get collections: %w", err)
	}

	collectionExists := false
	for _, s := range collections {
		if s.Name == scopeNameToCheck {
			for _, col := range s.Collections {
				if col.Name == collectionNameToCheck {
					collectionExists = true
					break
				}
			}
		}
		if collectionExists {
			break
		}
	}

	// Create collection if it doesn't exist
	if !collectionExists {
		log.Printf("Creating collection '%s' in scope '%s'", collectionNameToCheck, scopeNameToCheck)
		collectionSpec := gocb.CollectionSpec{
			Name:      collectionNameToCheck,
			ScopeName: scopeNameToCheck,
		}
		err := bucketMgr.CreateCollection(collectionSpec, nil)
		if err != nil {
			// Collection might already exist (race condition), check error
			if !isCollectionExistsError(err) {
				return fmt.Errorf("failed to create collection: %w", err)
			}
			log.Printf("Collection '%s' already exists in scope '%s'", collectionNameToCheck, scopeNameToCheck)
		} else {
			log.Printf("Successfully created collection '%s' in scope '%s'", collectionNameToCheck, scopeNameToCheck)
			// Wait a bit for collection to be ready
			time.Sleep(1 * time.Second)
		}
	} else {
		log.Printf("Collection '%s' already exists in scope '%s'", collectionNameToCheck, scopeNameToCheck)
	}

	// Verify we can access the collection
	scope := bucket.Scope(scopeNameToCheck)
	collection := scope.Collection(collectionNameToCheck)
	_, err = collection.Exists("test-key", nil)
	if err != nil {
		// This is expected if the key doesn't exist, but it verifies the collection is accessible
		log.Printf("Verified collection '%s' in scope '%s' is accessible", collectionNameToCheck, scopeNameToCheck)
	}

	return nil
}

// isScopeExistsError checks if the error indicates scope already exists
func isScopeExistsError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return containsIgnoreCase(errStr, "already exists") ||
		containsIgnoreCase(errStr, "ScopeAlreadyExists") ||
		containsIgnoreCase(errStr, "scope with this name already exists")
}

// isCollectionExistsError checks if the error indicates collection already exists
func isCollectionExistsError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return containsIgnoreCase(errStr, "already exists") ||
		containsIgnoreCase(errStr, "CollectionAlreadyExists") ||
		containsIgnoreCase(errStr, "collection with this name already exists")
}

// containsIgnoreCase checks if a string contains a substring (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	if len(s) < len(substr) {
		return false
	}
	sLower := toLowerString(s)
	substrLower := toLowerString(substr)
	for i := 0; i <= len(sLower)-len(substrLower); i++ {
		if sLower[i:i+len(substrLower)] == substrLower {
			return true
		}
	}
	return false
}

func toLowerString(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + 32
		} else {
			result[i] = c
		}
	}
	return string(result)
}

// GetBucket returns the Couchbase bucket instance
func GetBucket() *gocb.Bucket {
	return bucket
}

// GetScope returns the user scope
func GetScope() *gocb.Scope {
	return bucket.Scope(scopeName)
}

// GetTextsScope returns the texts scope
func GetTextsScope() *gocb.Scope {
	return bucket.Scope("texts")
}

// GetCollection returns the users collection from the user scope
func GetCollection(name string) *gocb.Collection {
	scope := bucket.Scope(scopeName)
	return scope.Collection(collectionName)
}

// GetTextsCollection returns the texts collection from the texts scope
func GetTextsCollection() *gocb.Collection {
	scope := bucket.Scope("texts")
	return scope.Collection("texts")
}

// GetBlacklistScope returns the blacklist scope
func GetBlacklistScope() *gocb.Scope {
	return bucket.Scope("blacklist")
}

// GetBlacklistCollection returns the tokens collection from the blacklist scope
func GetBlacklistCollection() *gocb.Collection {
	scope := bucket.Scope("blacklist")
	return scope.Collection("tokens")
}

// GetDocumentsScope returns the documents scope
func GetDocumentsScope() *gocb.Scope {
	return bucket.Scope("documents")
}

// GetDocumentsCollection returns the documents collection from the documents scope
func GetDocumentsCollection() *gocb.Collection {
	scope := bucket.Scope("documents")
	return scope.Collection("documents")
}

// GetBucketName returns the bucket name
func GetBucketName() string {
	return bucketName
}

// GetScopeName returns the scope name
func GetScopeName() string {
	return scopeName
}

// GetCollectionName returns the collection name
func GetCollectionName() string {
	return collectionName
}

// Close closes the Couchbase connection
func Close() {
	if cluster != nil {
		cluster.Close(nil)
	}
}
