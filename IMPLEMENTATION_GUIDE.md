# Implementation Guide: Scaling Improvements

This guide provides step-by-step implementation instructions for the critical scaling improvements.

---

## Phase 1: Redis Integration

### Step 1: Add Redis Dependencies

Update `go.mod`:

```bash
go get github.com/redis/go-redis/v9
go get github.com/go-redis/redis/v8  # Alternative
```

### Step 2: Create Redis Client

Create `internal/cache/redis.go`:

```go
package cache

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/redis/go-redis/v9"
)

var (
    redisClient *redis.Client
    ctx         = context.Background()
)

// InitRedis initializes the Redis client
func InitRedis() error {
    addr := os.Getenv("REDIS_ADDR")
    if addr == "" {
        addr = "localhost:6379"
    }

    password := os.Getenv("REDIS_PASSWORD")
    db := 0 // Default database

    redisClient = redis.NewClient(&redis.Options{
        Addr:         addr,
        Password:     password,
        DB:           db,
        PoolSize:     10,
        MinIdleConns: 5,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })

    // Test connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := redisClient.Ping(ctx).Err(); err != nil {
        return fmt.Errorf("failed to connect to Redis: %w", err)
    }

    return nil
}

// GetClient returns the Redis client
func GetClient() *redis.Client {
    return redisClient
}

// Close closes the Redis connection
func Close() error {
    if redisClient != nil {
        return redisClient.Close()
    }
    return nil
}
```

### Step 3: Redis-Based Token Blacklist

Update `internal/repository/redis_token_blacklist_repository.go`:

```go
package repository

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "time"

    "collaborative-editor/internal/cache"
    "github.com/redis/go-redis/v9"
)

type RedisTokenBlacklistRepository struct{}

func NewRedisTokenBlacklistRepository() *RedisTokenBlacklistRepository {
    return &RedisTokenBlacklistRepository{}
}

func hashToken(token string) string {
    hash := sha256.Sum256([]byte(token))
    return hex.EncodeToString(hash[:])
}

func (r *RedisTokenBlacklistRepository) AddToken(ctx context.Context, token string, expiresAt time.Time) error {
    client := cache.GetClient()
    if client == nil {
        return fmt.Errorf("Redis client not initialized")
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

    err := client.Set(ctx, key, "1", ttl).Err()
    if err != nil {
        return fmt.Errorf("failed to add token to blacklist: %w", err)
    }

    return nil
}

func (r *RedisTokenBlacklistRepository) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
    client := cache.GetClient()
    if client == nil {
        return false, fmt.Errorf("Redis client not initialized")
    }

    tokenHash := hashToken(token)
    key := fmt.Sprintf("blacklist:%s", tokenHash)

    exists, err := client.Exists(ctx, key).Result()
    if err != nil {
        if err == redis.Nil {
            return false, nil
        }
        return false, fmt.Errorf("failed to check token blacklist: %w", err)
    }

    return exists > 0, nil
}

func (r *RedisTokenBlacklistRepository) RemoveExpiredTokens(ctx context.Context) error {
    // Redis automatically expires keys, so this is a no-op
    // But we can add cleanup of any stale keys if needed
    return nil
}
```

### Step 4: Redis Caching Layer

Create `internal/cache/document_cache.go`:

```go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "collaborative-editor/pkg/document"
    "github.com/redis/go-redis/v9"
)

const (
    documentCacheTTL = 30 * time.Minute
    userCacheTTL     = 15 * time.Minute
)

// CacheDocument caches a document
func CacheDocument(ctx context.Context, doc *document.Document) error {
    client := GetClient()
    if client == nil {
        return fmt.Errorf("Redis client not initialized")
    }

    key := fmt.Sprintf("doc:%s", doc.ID)
    data, err := json.Marshal(doc)
    if err != nil {
        return fmt.Errorf("failed to marshal document: %w", err)
    }

    err = client.Set(ctx, key, data, documentCacheTTL).Err()
    if err != nil {
        return fmt.Errorf("failed to cache document: %w", err)
    }

    return nil
}

// GetCachedDocument retrieves a cached document
func GetCachedDocument(ctx context.Context, docID string) (*document.Document, error) {
    client := GetClient()
    if client == nil {
        return nil, fmt.Errorf("Redis client not initialized")
    }

    key := fmt.Sprintf("doc:%s", docID)
    data, err := client.Get(ctx, key).Bytes()
    if err != nil {
        if err == redis.Nil {
            return nil, nil // Not cached
        }
        return nil, fmt.Errorf("failed to get cached document: %w", err)
    }

    var doc document.Document
    if err := json.Unmarshal(data, &doc); err != nil {
        return nil, fmt.Errorf("failed to unmarshal document: %w", err)
    }

    return &doc, nil
}

// InvalidateDocumentCache removes a document from cache
func InvalidateDocumentCache(ctx context.Context, docID string) error {
    client := GetClient()
    if client == nil {
        return fmt.Errorf("Redis client not initialized")
    }

    key := fmt.Sprintf("doc:%s", docID)
    return client.Del(ctx, key).Err()
}

// CacheUser caches user information
func CacheUser(ctx context.Context, userID string, user interface{}) error {
    client := GetClient()
    if client == nil {
        return fmt.Errorf("Redis client not initialized")
    }

    key := fmt.Sprintf("user:%s", userID)
    data, err := json.Marshal(user)
    if err != nil {
        return fmt.Errorf("failed to marshal user: %w", err)
    }

    err = client.Set(ctx, key, data, userCacheTTL).Err()
    if err != nil {
        return fmt.Errorf("failed to cache user: %w", err)
    }

    return nil
}

// GetCachedUser retrieves a cached user
func GetCachedUser(ctx context.Context, userID string, user interface{}) error {
    client := GetClient()
    if client == nil {
        return fmt.Errorf("Redis client not initialized")
    }

    key := fmt.Sprintf("user:%s", userID)
    data, err := client.Get(ctx, key).Bytes()
    if err != nil {
        if err == redis.Nil {
            return fmt.Errorf("user not cached")
        }
        return fmt.Errorf("failed to get cached user: %w", err)
    }

    if err := json.Unmarshal(data, user); err != nil {
        return fmt.Errorf("failed to unmarshal user: %w", err)
    }

    return nil
}
```

### Step 5: Update Document Service with Caching

Update `internal/services/document_service.go`:

```go
// Add cache import
import "collaborative-editor/internal/cache"

// Update GetDocument method
func (s *DocumentService) GetDocument(ctx context.Context, userID, docID string) (*DocumentResponse, error) {
    // Try cache first
    cachedDoc, err := cache.GetCachedDocument(ctx, docID)
    if err == nil && cachedDoc != nil {
        if s.hasAccess(cachedDoc, userID) {
            return s.toResponse(cachedDoc), nil
        }
        return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
    }

    // Cache miss - fetch from database
    doc, err := s.docRepo.GetByID(ctx, docID)
    if err != nil {
        return nil, errors.WrapError(errors.ErrInternalServer, err)
    }

    if !s.hasAccess(doc, userID) {
        return nil, errors.NewAppError(errors.ErrForbidden.Code, "Access denied", nil)
    }

    // Cache the document
    cache.CacheDocument(ctx, doc)

    return s.toResponse(doc), nil
}

// Update UpdateDocument to invalidate cache
func (s *DocumentService) UpdateDocument(ctx context.Context, userID, docID string, req *CreateDocumentRequest) (*DocumentResponse, error) {
    // ... existing update logic ...

    // Invalidate cache
    cache.InvalidateDocumentCache(ctx, docID)

    // Optionally cache the updated document
    cache.CacheDocument(ctx, doc)

    return s.toResponse(doc), nil
}
```

### Step 6: Redis-Based WebSocket Hub

Create `internal/websocket/redis_hub.go`:

```go
package websocket

import (
    "context"
    "encoding/json"
    "log"
    "sync"
    "time"

    "collaborative-editor/internal/cache"
    "github.com/redis/go-redis/v9"
)

type RedisHub struct {
    localHub    *Hub
    redisClient *redis.Client
    pubsub      *redis.PubSub
    ctx         context.Context
    cancel      context.CancelFunc
    mu          sync.RWMutex
}

func NewRedisHub() (*RedisHub, error) {
    client := cache.GetClient()
    if client == nil {
        return nil, fmt.Errorf("Redis client not initialized")
    }

    ctx, cancel := context.WithCancel(context.Background())

    hub := &RedisHub{
        localHub:    NewHub(),
        redisClient: client,
        ctx:         ctx,
        cancel:      cancel,
    }

    // Subscribe to Redis pub/sub channel
    pubsub := client.Subscribe(ctx, "websocket:broadcast")
    hub.pubsub = pubsub

    // Start local hub
    go hub.localHub.Run()

    // Start Redis message handler
    go hub.handleRedisMessages()

    return hub, nil
}

func (h *RedisHub) handleRedisMessages() {
    ch := h.pubsub.Channel()
    for msg := range ch {
        var message Message
        if err := json.Unmarshal([]byte(msg.Payload), &message); err != nil {
            log.Printf("Error unmarshaling Redis message: %v", err)
            continue
        }

        // Broadcast to local clients only (avoid echo)
        h.localHub.broadcastToDocument(&message)
    }
}

func (h *RedisHub) Register(client *Client) {
    h.localHub.Register <- client

    // Add to Redis set for document room
    key := fmt.Sprintf("doc:room:%s", client.DocumentID)
    h.redisClient.SAdd(h.ctx, key, client.ID)
    h.redisClient.Expire(h.ctx, key, 1*time.Hour)
}

func (h *RedisHub) Unregister(client *Client) {
    h.localHub.unregister <- client

    // Remove from Redis set
    key := fmt.Sprintf("doc:room:%s", client.DocumentID)
    h.redisClient.SRem(h.ctx, key, client.ID)
}

func (h *RedisHub) BroadcastToDocument(message *Message) {
    // Broadcast to local clients
    h.localHub.broadcastToDocument(message)

    // Publish to Redis for other instances
    messageBytes, err := json.Marshal(message)
    if err != nil {
        log.Printf("Error marshaling message: %v", err)
        return
    }

    h.redisClient.Publish(h.ctx, "websocket:broadcast", messageBytes)
}

func (h *RedisHub) GetActiveUsers(documentID string) []UserInfo {
    // Get from local hub first
    users := h.localHub.GetActiveUsers(documentID)

    // Could also query Redis for other instances' users
    // For now, return local users
    return users
}

func (h *RedisHub) Close() error {
    h.cancel()
    if h.pubsub != nil {
        h.pubsub.Close()
    }
    return nil
}
```

### Step 7: Update Main Server

Update `cmd/server/main.go`:

```go
import (
    "collaborative-editor/internal/cache"
    // ... other imports
)

func main() {
    // ... existing code ...

    // Initialize Redis
    if err := cache.InitRedis(); err != nil {
        log.Fatalf("Failed to connect to Redis: %v", err)
    }
    defer cache.Close()

    // ... existing code ...

    // Use Redis-based token blacklist
    blacklistRepo := repository.NewRedisTokenBlacklistRepository()

    // Use Redis-based WebSocket hub
    hub, err := websocket.NewRedisHub()
    if err != nil {
        log.Fatalf("Failed to create Redis hub: %v", err)
    }
    defer hub.Close()

    // ... rest of the code ...
}
```

---

## Phase 2: Rate Limiting

### Step 1: Create Rate Limiter

Create `internal/middleware/ratelimit.go`:

```go
package middleware

import (
    "context"
    "fmt"
    "net/http"
    "strconv"
    "time"

    "collaborative-editor/internal/cache"
    "github.com/redis/go-redis/v9"
)

type RateLimiter struct {
    client *redis.Client
}

func NewRateLimiter() *RateLimiter {
    return &RateLimiter{
        client: cache.GetClient(),
    }
}

// RateLimitConfig defines rate limit rules
type RateLimitConfig struct {
    Requests int           // Number of requests
    Window   time.Duration // Time window
    KeyFunc  func(*http.Request) string // Function to generate rate limit key
}

// TokenBucket implements token bucket algorithm
func (rl *RateLimiter) TokenBucket(r *http.Request, config RateLimitConfig) (bool, error) {
    if rl.client == nil {
        return true, nil // Allow if Redis unavailable
    }

    key := config.KeyFunc(r)
    bucketKey := fmt.Sprintf("ratelimit:token:%s", key)

    ctx := r.Context()
    now := time.Now()

    // Use Redis Lua script for atomic operations
    script := `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local window = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(bucket[1]) or capacity
        local lastRefill = tonumber(bucket[2]) or now

        -- Refill tokens
        local elapsed = now - lastRefill
        local tokensToAdd = math.floor(elapsed * refillRate / 1000)
        tokens = math.min(capacity, tokens + tokensToAdd)
        lastRefill = now

        -- Check if we can consume a token
        if tokens >= 1 then
            tokens = tokens - 1
            redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
            redis.call('EXPIRE', key, window)
            return {1, tokens}
        else
            redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
            redis.call('EXPIRE', key, window)
            return {0, tokens}
        end
    `

    capacity := float64(config.Requests)
    refillRate := capacity / config.Window.Seconds() // tokens per second
    windowSeconds := int(config.Window.Seconds())

    result, err := rl.client.Eval(ctx, script, []string{bucketKey},
        capacity, refillRate, now.UnixMilli(), windowSeconds).Result()
    if err != nil {
        return true, err // Allow on error
    }

    res := result.([]interface{})
    allowed := res[0].(int64) == 1
    remaining := res[1].(int64)

    // Add headers
    r.Header.Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
    r.Header.Set("X-RateLimit-Reset", strconv.FormatInt(now.Add(config.Window).Unix(), 10))

    return allowed, nil
}

// SlidingWindow implements sliding window algorithm
func (rl *RateLimiter) SlidingWindow(r *http.Request, config RateLimitConfig) (bool, error) {
    if rl.client == nil {
        return true, nil
    }

    key := config.KeyFunc(r)
    windowKey := fmt.Sprintf("ratelimit:window:%s", key)

    ctx := r.Context()
    now := time.Now()
    windowStart := now.Add(-config.Window)

    // Remove old entries
    rl.client.ZRemRangeByScore(ctx, windowKey, "0", strconv.FormatInt(windowStart.Unix(), 10))

    // Count current requests
    count, err := rl.client.ZCard(ctx, windowKey).Result()
    if err != nil {
        return true, err
    }

    if count >= int64(config.Requests) {
        return false, nil
    }

    // Add current request
    rl.client.ZAdd(ctx, windowKey, redis.Z{
        Score:  float64(now.Unix()),
        Member: fmt.Sprintf("%d", now.UnixNano()),
    })
    rl.client.Expire(ctx, windowKey, config.Window)

    return true, nil
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(config RateLimitConfig) func(http.Handler) http.Handler {
    limiter := NewRateLimiter()

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            allowed, err := limiter.SlidingWindow(r, config)
            if err != nil {
                log.Printf("Rate limit error: %v", err)
                // Allow on error
                next.ServeHTTP(w, r)
                return
            }

            if !allowed {
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusTooManyRequests)
                w.Write([]byte(`{"error": "Rate limit exceeded"}`))
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

### Step 2: Apply Rate Limiting to Routes

Update `internal/routes/routes.go`:

```go
import "collaborative-editor/internal/middleware"

// Add rate limiting to login endpoint
http.Handle("/login", middleware.CORSMiddleware(
    middleware.RateLimitMiddleware(middleware.RateLimitConfig{
        Requests: 5,
        Window:   15 * time.Minute,
        KeyFunc: func(r *http.Request) string {
            // Rate limit by IP
            return r.RemoteAddr
        },
    })(http.HandlerFunc(userHandler.Login))))

// Add rate limiting to API endpoints
http.Handle("POST /documents", middleware.CORSMiddleware(
    middleware.AuthMiddleware(
        middleware.RateLimitMiddleware(middleware.RateLimitConfig{
            Requests: 50,
            Window:   1 * time.Minute,
            KeyFunc: func(r *http.Request) string {
                // Rate limit by user ID
                userID := middleware.GetUserID(r.Context())
                return fmt.Sprintf("user:%s", userID)
            },
        })(http.HandlerFunc(docHandler.CreateDocument)))))
```

---

## Phase 3: Enhanced Health Checks

Update health check endpoint:

```go
// internal/handlers/health_handler.go
package handlers

import (
    "encoding/json"
    "net/http"
    "time"

    "collaborative-editor/internal/cache"
    "collaborative-editor/internal/db"
)

type HealthResponse struct {
    Status    string            `json:"status"`
    Timestamp time.Time         `json:"timestamp"`
    Checks    map[string]string `json:"checks"`
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
    checks := make(map[string]string)
    status := "healthy"

    // Check Couchbase
    if err := db.CheckConnection(); err != nil {
        checks["couchbase"] = "unhealthy: " + err.Error()
        status = "unhealthy"
    } else {
        checks["couchbase"] = "healthy"
    }

    // Check Redis
    if cache.GetClient() == nil {
        checks["redis"] = "unhealthy: not initialized"
        status = "unhealthy"
    } else {
        ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
        defer cancel()
        if err := cache.GetClient().Ping(ctx).Err(); err != nil {
            checks["redis"] = "unhealthy: " + err.Error()
            status = "unhealthy"
        } else {
            checks["redis"] = "healthy"
        }
    }

    httpStatus := http.StatusOK
    if status == "unhealthy" {
        httpStatus = http.StatusServiceUnavailable
    }

    response := HealthResponse{
        Status:    status,
        Timestamp: time.Now(),
        Checks:    checks,
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(httpStatus)
    json.NewEncoder(w).Encode(response)
}
```

---

## Environment Variables

Add to your `.env` file:

```env
# Redis Configuration
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Optional: Redis Cluster
REDIS_CLUSTER_ENABLED=false
REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
```

---

## Testing

### Test Redis Connection

```go
// test_redis.go
package main

import (
    "log"
    "collaborative-editor/internal/cache"
)

func main() {
    if err := cache.InitRedis(); err != nil {
        log.Fatal(err)
    }
    log.Println("Redis connected successfully")
}
```

### Load Testing

Use tools like:
- **k6**: For API load testing
- **Artillery**: For WebSocket load testing
- **Apache Bench (ab)**: Simple HTTP load testing

---

## Next Steps

1. Implement Redis integration (Phase 1)
2. Add rate limiting (Phase 2)
3. Set up monitoring
4. Load test the improvements
5. Deploy to staging
6. Monitor and optimize

