package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"collaborative-editor/internal/auth"
	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/repository"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	userIDKey     contextKey = "userID"
	usernameKey   contextKey = "username"
	emailKey      contextKey = "email"
	documentIDKey contextKey = "documentID"
	permissionKey contextKey = "permission"
)

var blacklistRepo repository.TokenBlacklistRepository

// SetBlacklistRepository sets the token blacklist repository for the middleware
func SetBlacklistRepository(repo repository.TokenBlacklistRepository) {
	blacklistRepo = repo
}

// AuthMiddleware validates JWT tokens for protected routes
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, errors.NewAppError(
				errors.ErrUnauthorized.Code,
				"Authorization header is required",
				nil,
			))
			return
		}

		// Check if header starts with "Bearer "
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondWithError(w, errors.NewAppError(
				errors.ErrUnauthorized.Code,
				"Authorization header must be in format: Bearer <token>",
				nil,
			))
			return
		}

		tokenString := parts[1]

		// Create blacklist checker if repository is available
		var blacklistChecker auth.TokenBlacklistChecker
		if blacklistRepo != nil {
			blacklistChecker = func(token string) (bool, error) {
				return blacklistRepo.IsTokenBlacklisted(r.Context(), token)
			}
		}

		// Validate token with blacklist check
		claims, err := auth.ValidateToken(tokenString, blacklistChecker)
		if err != nil {
			respondWithError(w, errors.NewAppError(
				errors.ErrUnauthorized.Code,
				"Invalid or expired token",
				err,
			))
			return
		}

		// Add user information to request context
		ctx := r.Context()
		ctx = withUserID(ctx, claims.UserID)
		ctx = withUsername(ctx, claims.Username)
		ctx = withEmail(ctx, claims.Email)
		// Add guest specific claims if present
		if claims.DocumentID != "" {
			ctx = withDocumentID(ctx, claims.DocumentID)
		}
		if claims.Permission != "" {
			ctx = withPermission(ctx, claims.Permission)
		}

		// Call next handler with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Context helper functions
func withUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func withUsername(ctx context.Context, username string) context.Context {
	return context.WithValue(ctx, usernameKey, username)
}

func withEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, emailKey, email)
}

func withDocumentID(ctx context.Context, documentID string) context.Context {
	return context.WithValue(ctx, documentIDKey, documentID)
}

func withPermission(ctx context.Context, permission string) context.Context {
	return context.WithValue(ctx, permissionKey, permission)
}

// ValidateToken validates a JWT token and returns the user ID
// This is a standalone function for use in WebSocket handlers
func ValidateToken(tokenString string) (string, error) {
	secret := auth.GetJWTSecret()
	if secret == nil {
		return "", fmt.Errorf("JWT secret not set")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return secret, nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, ok := claims["user_id"].(string)
		if !ok {
			return "", fmt.Errorf("invalid user_id in token")
		}
		return userID, nil
	}

	return "", fmt.Errorf("invalid token")
}

// GetUserID retrieves user ID from context
func GetUserID(ctx context.Context) string {
	if userID, ok := ctx.Value(userIDKey).(string); ok {
		return userID
	}
	return ""
}

// GetUsername retrieves username from context
func GetUsername(ctx context.Context) string {
	if username, ok := ctx.Value(usernameKey).(string); ok {
		return username
	}
	return ""
}

// GetEmail retrieves email from context
func GetEmail(ctx context.Context) string {
	if email, ok := ctx.Value(emailKey).(string); ok {
		return email
	}
	return ""
}

// GetDocumentID retrieves document ID from context (for guest tokens)
func GetDocumentID(ctx context.Context) string {
	if docID, ok := ctx.Value(documentIDKey).(string); ok {
		return docID
	}
	return ""
}

// GetPermission retrieves permission from context (for guest tokens)
func GetPermission(ctx context.Context) string {
	if perm, ok := ctx.Value(permissionKey).(string); ok {
		return perm
	}
	return ""
}

// CORSMiddleware allows all origins, methods, and headers
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers to allow all origins
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call next handler
		next.ServeHTTP(w, r)
	})
}

// respondWithError sends an error response
func respondWithError(w http.ResponseWriter, err error) {
	appErr, ok := err.(*errors.AppError)
	if !ok {
		appErr = errors.ErrInternalServer
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.Code)
	json.NewEncoder(w).Encode(map[string]string{
		"error": appErr.Message,
	})
}
