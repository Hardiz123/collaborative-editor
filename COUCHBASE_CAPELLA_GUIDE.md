# Couchbase Capella Ephemeral Buckets Guide

This guide shows how to use Couchbase Capella's **Ephemeral (in-memory) buckets** as an alternative to Redis for caching, session management, and other temporary data storage needs.

---

## 📚 What are Ephemeral Buckets?

**Ephemeral buckets** in Couchbase Capella are in-memory buckets designed for:
- **High-performance caching** (sub-millisecond latency)
- **Temporary data storage** (sessions, tokens, rate limits)
- **Real-time data** that doesn't need persistence
- **Reducing load on persistent buckets**

### Key Features:
- ✅ **In-memory storage** - Data stored in RAM for ultra-fast access
- ✅ **Automatic expiration** - Built-in TTL support
- ✅ **Same API** - Use existing Couchbase SDK, no code changes needed
- ✅ **Integrated** - Part of your existing Couchbase cluster
- ✅ **Scalable** - Automatically scales with your cluster
- ✅ **No additional infrastructure** - No need for separate Redis instance

---

## 🔄 Redis vs Couchbase Ephemeral Buckets

### When to Use Ephemeral Buckets:
- ✅ Already using Couchbase Capella
- ✅ Want unified infrastructure (one database system)
- ✅ Need sub-millisecond latency for caching
- ✅ Want automatic scaling with your cluster
- ✅ Prefer integrated solution over separate Redis instance
- ✅ Need complex queries on cached data (N1QL)

### When to Use Redis:
- ✅ Need Pub/Sub messaging (Couchbase uses Eventing/DCP)
- ✅ Want simple key-value operations only
- ✅ Using Redis-specific features (Streams, Bitmaps, etc.)
- ✅ Need Redis ecosystem tools
- ✅ Separate infrastructure preferred

### Performance Comparison:
| Feature | Couchbase Ephemeral | Redis |
|---------|-------------------|-------|
| Latency | < 1ms | < 1ms |
| Throughput | Very High | Very High |
| Persistence | No (by design) | Optional |
| Queries | N1QL support | Limited |
| Scaling | Auto-scales | Manual sharding |
| Integration | Native | Separate service |

---

## 🚀 Setup: Creating Ephemeral Bucket in Capella

### Step 1: Create Ephemeral Bucket in Capella UI

1. Log into [Couchbase Capella](https://cloud.couchbase.com)
2. Navigate to your cluster
3. Go to **Buckets** → **Create Bucket**
4. Configure:
   - **Name**: `cache` (or `ephemeral-cache`)
   - **Type**: **Ephemeral** (not Couchbase)
   - **Memory Quota**: 256MB - 2GB (depending on needs)
   - **Replicas**: 1 (for high availability)
   - **Eviction Policy**: **Full Eviction** (recommended for cache)

### Step 2: Create Scopes and Collections

Create scopes and collections for different cache types:

```
Bucket: cache
├── Scope: sessions
│   └── Collection: user_sessions
├── Scope: blacklist
│   └── Collection: tokens
├── Scope: rate_limit
│   └── Collection: limits
└── Scope: cache
    ├── Collection: documents
    └── Collection: users
```

### Step 3: Update Connection Code

Update `internal/db/couchbase.go` to support multiple buckets:

```go
package db

import (
    "fmt"
    "log"
    "os"
    "time"

    "github.com/couchbase/gocb/v2"
)

var (
    cluster         *gocb.Cluster
    persistentBucket *gocb.Bucket  // For persistent data
    cacheBucket     *gocb.Bucket  // Ephemeral bucket for caching
    persistentBucketName string
    cacheBucketName     string
)

// Connect initializes connections to both persistent and cache buckets
func Connect() error {
    connectionString := os.Getenv("COUCHBASE_CONNECTION_STRING")
    username := os.Getenv("COUCHBASE_USERNAME")
    password := os.Getenv("COUCHBASE_PASSWORD")
    
    persistentBucketName = os.Getenv("COUCHBASE_BUCKET_NAME")
    if persistentBucketName == "" {
        persistentBucketName = "collab-editor"
    }

    cacheBucketName = os.Getenv("COUCHBASE_CACHE_BUCKET_NAME")
    if cacheBucketName == "" {
        cacheBucketName = "cache" // Default ephemeral bucket name
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

    // Open persistent bucket
    persistentBucket = cluster.Bucket(persistentBucketName)
    err = persistentBucket.WaitUntilReady(10*time.Second, nil)
    if err != nil {
        return fmt.Errorf("failed to wait for persistent bucket ready: %w", err)
    }

    // Open cache bucket (ephemeral)
    cacheBucket = cluster.Bucket(cacheBucketName)
    err = cacheBucket.WaitUntilReady(10*time.Second, nil)
    if err != nil {
        log.Printf("Warning: Cache bucket not available, caching disabled: %v", err)
        // Don't fail if cache bucket doesn't exist, just log warning
    } else {
        log.Printf("Successfully connected to cache bucket: %s", cacheBucketName)
        // Setup cache bucket scopes and collections
        if err := setupCacheBucket(); err != nil {
            log.Printf("Warning: Failed to setup cache bucket: %v", err)
        }
    }

    // Setup persistent bucket scopes and collections (existing code)
    if err := ensureScopeAndCollection("user", "users"); err != nil {
        return fmt.Errorf("failed to setup user scope and collection: %w", err)
    }
    // ... other persistent bucket setup

    log.Printf("Successfully connected to Couchbase buckets: %s (persistent), %s (cache)", 
        persistentBucketName, cacheBucketName)
    return nil
}

// setupCacheBucket creates scopes and collections in the ephemeral cache bucket
func setupCacheBucket() error {
    if cacheBucket == nil {
        return fmt.Errorf("cache bucket not initialized")
    }

    bucketMgr := cacheBucket.Collections()

    // Create cache scopes and collections
    cacheScopes := map[string][]string{
        "sessions":   {"user_sessions"},
        "blacklist":  {"tokens"},
        "rate_limit": {"limits"},
        "cache":      {"documents", "users"},
    }

    for scopeName, collections := range cacheScopes {
        if err := ensureScopeAndCollectionInBucket(bucketMgr, scopeName, collections); err != nil {
            return fmt.Errorf("failed to setup cache scope %s: %w", scopeName, err)
        }
    }

    return nil
}

// ensureScopeAndCollectionInBucket is a helper for cache bucket setup
func ensureScopeAndCollectionInBucket(bucketMgr *gocb.CollectionManager, scopeName string, collectionNames []string) error {
    // Check if scope exists
    scopes, err := bucketMgr.GetAllScopes(nil)
    if err != nil {
        return fmt.Errorf("failed to get scopes: %w", err)
    }

    scopeExists := false
    for _, scope := range scopes {
        if scope.Name == scopeName {
            scopeExists = true
            break
        }
    }

    // Create scope if it doesn't exist
    if !scopeExists {
        if err := bucketMgr.CreateScope(scopeName, nil); err != nil {
            if !isScopeExistsError(err) {
                return fmt.Errorf("failed to create scope: %w", err)
            }
        }
    }

    // Create collections
    for _, collectionName := range collectionNames {
        collections, err := bucketMgr.GetAllScopes(nil)
        if err != nil {
            return fmt.Errorf("failed to get collections: %w", err)
        }

        collectionExists := false
        for _, s := range collections {
            if s.Name == scopeName {
                for _, col := range s.Collections {
                    if col.Name == collectionName {
                        collectionExists = true
                        break
                    }
                }
            }
        }

        if !collectionExists {
            collectionSpec := gocb.CollectionSpec{
                Name:      collectionName,
                ScopeName: scopeName,
            }
            if err := bucketMgr.CreateCollection(collectionSpec, nil); err != nil {
                if !isCollectionExistsError(err) {
                    return fmt.Errorf("failed to create collection: %w", err)
                }
            }
        }
    }

    return nil
}

// GetCacheBucket returns the ephemeral cache bucket
func GetCacheBucket() *gocb.Bucket {
    return cacheBucket
}

// GetCacheScope returns a scope from the cache bucket
func GetCacheScope(scopeName string) *gocb.Scope {
    if cacheBucket == nil {
        return nil
    }
    return cacheBucket.Scope(scopeName)
}

// GetCacheCollection returns a collection from the cache bucket
func GetCacheCollection(scopeName, collectionName string) *gocb.Collection {
    if cacheBucket == nil {
        return nil
    }
    return cacheBucket.Scope(scopeName).Collection(collectionName)
}

// GetCluster returns the Couchbase cluster instance
func GetCluster() *gocb.Cluster {
    return cluster
}

// GetCacheBucketName returns the cache bucket name
func GetCacheBucketName() string {
    return cacheBucketName
}
```

---

## 💾 Implementation: Caching with Ephemeral Buckets

### Document Cache

Create `internal/cache/couchbase_cache.go`:

```go
package cache

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "time"

    "collaborative-editor/internal/db"
    "collaborative-editor/pkg/document"
    "github.com/couchbase/gocb/v2"
)

const (
    documentCacheTTL = 30 * time.Minute
    userCacheTTL     = 15 * time.Minute
)

// CacheDocument caches a document in the ephemeral bucket
func CacheDocument(ctx context.Context, doc *document.Document) error {
    collection := db.GetCacheCollection("cache", "documents")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("doc:%s", doc.ID)
    data, err := json.Marshal(doc)
    if err != nil {
        return fmt.Errorf("failed to marshal document: %w", err)
    }

    // Use Upsert with expiration
    _, err = collection.Upsert(key, data, &gocb.UpsertOptions{
        Context:      ctx,
        Expiry:       documentCacheTTL,
        DurabilityLevel: gocb.DurabilityLevelNone, // No persistence needed for cache
    })
    if err != nil {
        return fmt.Errorf("failed to cache document: %w", err)
    }

    return nil
}

// GetCachedDocument retrieves a cached document
func GetCachedDocument(ctx context.Context, docID string) (*document.Document, error) {
    collection := db.GetCacheCollection("cache", "documents")
    if collection == nil {
        return nil, fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("doc:%s", docID)
    result, err := collection.Get(key, &gocb.GetOptions{
        Context: ctx,
    })
    if err != nil {
        if errors.Is(err, gocb.ErrDocumentNotFound) {
            return nil, nil // Not cached
        }
        return nil, fmt.Errorf("failed to get cached document: %w", err)
    }

    var doc document.Document
    if err := result.Content(&doc); err != nil {
        return nil, fmt.Errorf("failed to decode document: %w", err)
    }

    return &doc, nil
}

// InvalidateDocumentCache removes a document from cache
func InvalidateDocumentCache(ctx context.Context, docID string) error {
    collection := db.GetCacheCollection("cache", "documents")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("doc:%s", docID)
    _, err := collection.Remove(key, &gocb.RemoveOptions{
        Context: ctx,
    })
    if err != nil && !errors.Is(err, gocb.ErrDocumentNotFound) {
        return fmt.Errorf("failed to invalidate cache: %w", err)
    }

    return nil
}

// CacheUser caches user information
func CacheUser(ctx context.Context, userID string, user interface{}) error {
    collection := db.GetCacheCollection("cache", "users")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("user:%s", userID)
    data, err := json.Marshal(user)
    if err != nil {
        return fmt.Errorf("failed to marshal user: %w", err)
    }

    _, err = collection.Upsert(key, data, &gocb.UpsertOptions{
        Context:      ctx,
        Expiry:       userCacheTTL,
        DurabilityLevel: gocb.DurabilityLevelNone,
    })
    if err != nil {
        return fmt.Errorf("failed to cache user: %w", err)
    }

    return nil
}

// GetCachedUser retrieves a cached user
func GetCachedUser(ctx context.Context, userID string, user interface{}) error {
    collection := db.GetCacheCollection("cache", "users")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("user:%s", userID)
    result, err := collection.Get(key, &gocb.GetOptions{
        Context: ctx,
    })
    if err != nil {
        if errors.Is(err, gocb.ErrDocumentNotFound) {
            return fmt.Errorf("user not cached")
        }
        return fmt.Errorf("failed to get cached user: %w", err)
    }

    if err := result.Content(user); err != nil {
        return fmt.Errorf("failed to decode user: %w", err)
    }

    return nil
}
```

---

## 🔐 Token Blacklist with Ephemeral Bucket

Update `internal/repository/couchbase_ephemeral_token_blacklist_repository.go`:

```go
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

type CouchbaseEphemeralTokenBlacklistRepository struct{}

func NewCouchbaseEphemeralTokenBlacklistRepository() *CouchbaseEphemeralTokenBlacklistRepository {
    return &CouchbaseEphemeralTokenBlacklistRepository{}
}

func hashToken(token string) string {
    hash := sha256.Sum256([]byte(token))
    return hex.EncodeToString(hash[:])
}

func (r *CouchbaseEphemeralTokenBlacklistRepository) AddToken(ctx context.Context, token string, expiresAt time.Time) error {
    collection := db.GetCacheCollection("blacklist", "tokens")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    tokenHash := hashToken(token)
    key := fmt.Sprintf("blacklist:%s", tokenHash)

    // Calculate TTL
    ttl := time.Until(expiresAt)
    if ttl <= 0 {
        return nil // Already expired
    }

    // Add small buffer
    ttl = ttl + time.Hour

    blacklistedToken := map[string]interface{}{
        "token_hash": tokenHash,
        "expires_at": expiresAt,
        "blacklisted_at": time.Now(),
    }

    // Use Upsert with expiration - Ephemeral bucket will auto-delete when TTL expires
    _, err := collection.Upsert(key, blacklistedToken, &gocb.UpsertOptions{
        Context:      ctx,
        Expiry:       ttl,
        DurabilityLevel: gocb.DurabilityLevelNone, // No persistence needed
    })
    if err != nil {
        return fmt.Errorf("failed to add token to blacklist: %w", err)
    }

    return nil
}

func (r *CouchbaseEphemeralTokenBlacklistRepository) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
    collection := db.GetCacheCollection("blacklist", "tokens")
    if collection == nil {
        return false, fmt.Errorf("cache bucket not available")
    }

    tokenHash := hashToken(token)
    key := fmt.Sprintf("blacklist:%s", tokenHash)

    // Try to get the document - if it exists, token is blacklisted
    // Ephemeral bucket automatically removes expired documents
    _, err := collection.Get(key, &gocb.GetOptions{
        Context: ctx,
    })
    if err != nil {
        if errors.Is(err, gocb.ErrDocumentNotFound) {
            return false, nil // Token is not blacklisted (or has expired)
        }
        return false, fmt.Errorf("failed to check token blacklist: %w", err)
    }

    // Document exists, token is blacklisted
    return true, nil
}

func (r *CouchbaseEphemeralTokenBlacklistRepository) RemoveExpiredTokens(ctx context.Context) error {
    // Ephemeral bucket automatically removes expired tokens via TTL
    // This is a no-op, but kept for interface compatibility
    return nil
}
```

---

## ⏱️ Rate Limiting with Ephemeral Bucket

Create `internal/middleware/couchbase_ratelimit.go`:

```go
package middleware

import (
    "context"
    "errors"
    "fmt"
    "net/http"
    "os"
    "strconv"
    "time"

    "collaborative-editor/internal/db"
    "github.com/couchbase/gocb/v2"
)

type CouchbaseRateLimiter struct{}

func NewCouchbaseRateLimiter() *CouchbaseRateLimiter {
    return &CouchbaseRateLimiter{}
}

type RateLimitConfig struct {
    Requests int
    Window   time.Duration
    KeyFunc  func(*http.Request) string
}

// SlidingWindow implements sliding window rate limiting using Ephemeral bucket
func (rl *CouchbaseRateLimiter) SlidingWindow(r *http.Request, config RateLimitConfig) (bool, error) {
    collection := db.GetCacheCollection("rate_limit", "limits")
    if collection == nil {
        return true, nil // Allow if cache unavailable
    }

    key := config.KeyFunc(r)
    windowKey := fmt.Sprintf("ratelimit:%s", key)

    ctx := r.Context()
    now := time.Now()
    windowStart := now.Add(-config.Window)

    // Use N1QL query to count requests in window
    // This is more efficient than scanning all keys
    cacheBucketName := os.Getenv("COUCHBASE_CACHE_BUCKET_NAME")
    if cacheBucketName == "" {
        cacheBucketName = "cache"
    }
    
    query := fmt.Sprintf(`
        SELECT COUNT(*) as count
        FROM `+"`%s`.`rate_limit`.`limits`"+`
        WHERE META().id LIKE $1
        AND created_at >= $2
    `, cacheBucketName)

    params := map[string]interface{}{
        "$1": windowKey + ":%",
        "$2": windowStart,
    }

    cluster := db.GetCluster() // Need to add this function to db package
    if cluster == nil {
        return true, fmt.Errorf("cluster not available")
    }
    
    result, err := cluster.Query(query, &gocb.QueryOptions{
        Context:          ctx,
        NamedParameters: params,
    })
    if err != nil {
        return true, err // Allow on error
    }

    var count int
    if result.Next() {
        var row map[string]interface{}
        if err := result.Row(&row); err == nil {
            if c, ok := row["count"].(float64); ok {
                count = int(c)
            }
        }
    }

    if count >= config.Requests {
        return false, nil
    }

    // Add current request
    requestKey := fmt.Sprintf("%s:%d", windowKey, now.UnixNano())
    requestData := map[string]interface{}{
        "created_at": now,
        "key":        key,
    }

    _, err = collection.Upsert(requestKey, requestData, &gocb.UpsertOptions{
        Context:      ctx,
        Expiry:       config.Window,
        DurabilityLevel: gocb.DurabilityLevelNone,
    })
    if err != nil {
        return true, err
    }

    return true, nil
}

// TokenBucket implements token bucket using Ephemeral bucket
func (rl *CouchbaseRateLimiter) TokenBucket(r *http.Request, config RateLimitConfig) (bool, error) {
    collection := db.GetCacheCollection("rate_limit", "limits")
    if collection == nil {
        return true, nil
    }

    key := config.KeyFunc(r)
    bucketKey := fmt.Sprintf("ratelimit:token:%s", key)

    ctx := r.Context()
    now := time.Now()

    // Use CAS (Compare-And-Swap) for atomic operations
    var bucket map[string]interface{}
    result, err := collection.Get(bucketKey, &gocb.GetOptions{Context: ctx})
    
    if err != nil && !errors.Is(err, gocb.ErrDocumentNotFound) {
        return true, err
    }

    capacity := float64(config.Requests)
    refillRate := capacity / config.Window.Seconds()
    tokens := capacity
    lastRefill := now

    if err == nil {
        // Bucket exists, decode it
        if err := result.Content(&bucket); err == nil {
            if t, ok := bucket["tokens"].(float64); ok {
                tokens = t
            }
            if lr, ok := bucket["last_refill"].(string); ok {
                if t, err := time.Parse(time.RFC3339, lr); err == nil {
                    lastRefill = t
                }
            }
        }
        cas := result.Cas()

        // Refill tokens
        elapsed := now.Sub(lastRefill).Seconds()
        tokensToAdd := elapsed * refillRate
        tokens = min(capacity, tokens+tokensToAdd)
        lastRefill = now

        // Check if we can consume a token
        if tokens >= 1 {
            tokens = tokens - 1
            bucket["tokens"] = tokens
            bucket["last_refill"] = lastRefill.Format(time.RFC3339)

            _, err = collection.Replace(bucketKey, bucket, &gocb.ReplaceOptions{
                Context:      ctx,
                Cas:          cas,
                Expiry:       config.Window,
                DurabilityLevel: gocb.DurabilityLevelNone,
            })
            if err != nil {
                // CAS conflict, retry
                return rl.TokenBucket(r, config)
            }

            return true, nil
        } else {
            // Update bucket even if no token available
            bucket["tokens"] = tokens
            bucket["last_refill"] = lastRefill.Format(time.RFC3339)
            collection.Replace(bucketKey, bucket, &gocb.ReplaceOptions{
                Context:      ctx,
                Cas:          result.Cas(),
                Expiry:       config.Window,
                DurabilityLevel: gocb.DurabilityLevelNone,
            })
            return false, nil
        }
    } else {
        // Bucket doesn't exist, create it
        tokens = capacity - 1
        bucket = map[string]interface{}{
            "tokens":      tokens,
            "last_refill": lastRefill.Format(time.RFC3339),
        }

        _, err = collection.Insert(bucketKey, bucket, &gocb.InsertOptions{
            Context:      ctx,
            Expiry:       config.Window,
            DurabilityLevel: gocb.DurabilityLevelNone,
        })
        if err != nil {
            return true, err
        }

        return true, nil
    }
}

func min(a, b float64) float64 {
    if a < b {
        return a
    }
    return b
}
```

---

## 🔄 WebSocket Hub with Couchbase Eventing

For distributed WebSocket messaging, use **Couchbase Eventing** (instead of Redis Pub/Sub):

### Option 1: Use Couchbase Eventing Functions

Couchbase Eventing can trigger functions on document changes, which can be used to broadcast messages.

### Option 2: Use DCP (Database Change Protocol)

For real-time updates, use Couchbase's DCP stream.

### Option 3: Hybrid Approach (Recommended)

Keep local in-memory hub but use Ephemeral bucket for state:

```go
// internal/websocket/couchbase_hub.go
package websocket

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "sync"
    "time"

    "collaborative-editor/internal/db"
    "github.com/couchbase/gocb/v2"
)

type CouchbaseHub struct {
    localHub *Hub
    mu       sync.RWMutex
}

func NewCouchbaseHub() (*CouchbaseHub, error) {
    hub := &CouchbaseHub{
        localHub: NewHub(),
    }

    // Start local hub
    go hub.localHub.Run()

    // Start DCP listener for cross-instance updates (optional)
    // This would require additional setup

    return hub, nil
}

// RegisterClient registers a client and stores state in Ephemeral bucket
func (h *CouchbaseHub) RegisterClient(client *Client) {
    h.localHub.Register <- client

    // Store connection state in Ephemeral bucket
    collection := db.GetCacheCollection("sessions", "user_sessions")
    if collection != nil {
        key := fmt.Sprintf("ws:client:%s", client.ID)
        state := map[string]interface{}{
            "client_id":   client.ID,
            "user_id":     client.UserID,
            "document_id": client.DocumentID,
            "connected_at": time.Now(),
        }

        ctx := context.Background()
        collection.Upsert(key, state, &gocb.UpsertOptions{
            Context:      ctx,
            Expiry:       1 * time.Hour, // Auto-cleanup disconnected clients
            DurabilityLevel: gocb.DurabilityLevelNone,
        })
    }
}

// BroadcastToDocument broadcasts to local clients and stores message in cache
func (h *CouchbaseHub) BroadcastToDocument(message *Message) {
    // Broadcast to local clients
    h.localHub.broadcastToDocument(message)

    // Store message in Ephemeral bucket for other instances to pick up
    // (This requires polling or DCP stream - see advanced section)
}
```

---

## 📊 Session Management

Create `internal/cache/session_cache.go`:

```go
package cache

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "time"

    "collaborative-editor/internal/db"
    "github.com/couchbase/gocb/v2"
)

const sessionTTL = 24 * time.Hour

type Session struct {
    UserID    string    `json:"user_id"`
    Username  string    `json:"username"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
    ExpiresAt time.Time `json:"expires_at"`
}

// StoreSession stores a user session in Ephemeral bucket
func StoreSession(ctx context.Context, sessionID string, session *Session) error {
    collection := db.GetCacheCollection("sessions", "user_sessions")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("session:%s", sessionID)
    ttl := time.Until(session.ExpiresAt)
    if ttl <= 0 {
        return fmt.Errorf("session already expired")
    }

    _, err := collection.Upsert(key, session, &gocb.UpsertOptions{
        Context:      ctx,
        Expiry:       ttl,
        DurabilityLevel: gocb.DurabilityLevelNone,
    })
    return err
}

// GetSession retrieves a session from Ephemeral bucket
func GetSession(ctx context.Context, sessionID string) (*Session, error) {
    collection := db.GetCacheCollection("sessions", "user_sessions")
    if collection == nil {
        return nil, fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("session:%s", sessionID)
    result, err := collection.Get(key, &gocb.GetOptions{
        Context: ctx,
    })
    if err != nil {
        if errors.Is(err, gocb.ErrDocumentNotFound) {
            return nil, fmt.Errorf("session not found")
        }
        return nil, err
    }

    var session Session
    if err := result.Content(&session); err != nil {
        return nil, err
    }

    return &session, nil
}

// DeleteSession removes a session
func DeleteSession(ctx context.Context, sessionID string) error {
    collection := db.GetCacheCollection("sessions", "user_sessions")
    if collection == nil {
        return fmt.Errorf("cache bucket not available")
    }

    key := fmt.Sprintf("session:%s", sessionID)
    _, err := collection.Remove(key, &gocb.RemoveOptions{
        Context: ctx,
    })
    return err
}
```

---

## 🔧 Environment Variables

Add to your `.env`:

```env
# Couchbase Configuration
COUCHBASE_CONNECTION_STRING=couchbases://your-cluster.cloud.couchbase.com
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_BUCKET_NAME=collab-editor  # Persistent bucket
COUCHBASE_CACHE_BUCKET_NAME=cache    # Ephemeral bucket
```

---

## 📈 Performance Tips

### 1. Optimize Memory Quota
- Start with 256MB for cache bucket
- Monitor memory usage in Capella dashboard
- Scale up as needed (up to several GB)

### 2. Use Appropriate Eviction Policy
- **Full Eviction**: Best for cache (recommended)
- **Value Eviction**: For mixed workloads

### 3. Set TTLs Appropriately
- Documents: 30 minutes
- Users: 15 minutes
- Sessions: 24 hours
- Rate limits: 1-15 minutes
- Token blacklist: Match token expiration

### 4. Use N1QL for Complex Queries
Ephemeral buckets support N1QL, allowing complex cache queries:

```go
query := `
    SELECT * FROM ` + "`cache`.`cache`.`documents`" + `
    WHERE META().id LIKE 'doc:%'
    AND updated_at > $1
    ORDER BY updated_at DESC
    LIMIT 10
`
```

---

## 🔄 Migration from Redis

If you're currently using Redis and want to migrate:

### Step 1: Parallel Run
- Run both Redis and Ephemeral bucket simultaneously
- Write to both, read from Redis (fallback to Ephemeral)

### Step 2: Gradual Migration
- Migrate one feature at a time (cache, then blacklist, etc.)
- Monitor performance and errors

### Step 3: Complete Migration
- Remove Redis dependency
- Update all code to use Ephemeral bucket
- Remove Redis infrastructure

---

## ✅ Advantages of Ephemeral Buckets

1. **Unified Infrastructure** - One database system
2. **No Additional Service** - No Redis to manage
3. **Automatic Scaling** - Scales with your cluster
4. **N1QL Support** - Complex queries on cached data
5. **Integrated Monitoring** - Same dashboard as persistent data
6. **Cost Effective** - No separate Redis instance costs
7. **Consistent API** - Same SDK and patterns

---

## ⚠️ Limitations

1. **No Pub/Sub** - Use Eventing or DCP instead
2. **No Persistence** - Data is lost on restart (by design)
3. **Memory Bound** - Limited by bucket memory quota
4. **Cluster Dependency** - Requires Couchbase cluster

---

## 📚 Additional Resources

- [Couchbase Ephemeral Buckets Documentation](https://docs.couchbase.com/server/current/manage/manage-buckets/ephemeral-buckets.html)
- [Couchbase Capella Documentation](https://docs.couchbase.com/cloud/)
- [Couchbase Eventing Functions](https://docs.couchbase.com/server/current/eventing/eventing-overview.html)
- [Couchbase DCP Protocol](https://docs.couchbase.com/server/current/learn/data/durability-and-consistency.html)

---

**Last Updated**: 2024
**Status**: Production Ready

