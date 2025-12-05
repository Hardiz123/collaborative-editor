package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/couchbase/gocb/v2"
)

var (
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
)

// Connect initializes the Couchbase connection
func Connect() error {
	connectionString := os.Getenv("COUCHBASE_CONNECTION_STRING")
	username := os.Getenv("COUCHBASE_USERNAME")
	password := os.Getenv("COUCHBASE_PASSWORD")

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
	cluster, err := gocb.Connect(connectionString, gocb.ClusterOptions{
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

	log.Println("Successfully connected to Couchbase")
	return nil
}

// GetBucket returns the Couchbase bucket instance
func GetBucket() *gocb.Bucket {
	return bucket
}

// GetCollection returns a collection from the bucket
func GetCollection(collectionName string) *gocb.Collection {
	return bucket.DefaultCollection()
}

// Close closes the Couchbase connection
func Close() {
	if cluster != nil {
		cluster.Close(nil)
	}
}
