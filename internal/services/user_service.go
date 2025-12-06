package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"collaborative-editor/internal/auth"
	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/repository"
	"collaborative-editor/internal/validation"
	"collaborative-editor/pkg/user"

	"golang.org/x/crypto/bcrypt"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo      repository.UserRepository
	blacklistRepo repository.TokenBlacklistRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository, blacklistRepo repository.TokenBlacklistRepository) *UserService {
	return &UserService{
		userRepo:      userRepo,
		blacklistRepo: blacklistRepo,
	}
}

// SignupRequest represents a user signup request
type SignupRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// SignupResponse represents a user signup response
type SignupResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email"` // Can be email or username
	Password string `json:"password"`
}

// LoginResponse represents a user login response
type LoginResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
	Token     string `json:"token"` // JWT token for authentication
	Message   string `json:"message"`
}

// Signup creates a new user account
func (s *UserService) Signup(ctx context.Context, req *SignupRequest) (*SignupResponse, error) {
	// Normalize input
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	// Validate input
	if err := validation.ValidateSignupRequest(req.Username, req.Email, req.Password); err != nil {
		return nil, errors.WrapError(errors.ErrInvalidInput, err)
	}

	// Check if user with email already exists
	existingUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, errors.NewAppError(
			errors.ErrConflict.Code,
			"User with this email already exists",
			nil,
		)
	}

	// Check if user with username already exists
	existingUser, err = s.userRepo.GetByUsername(ctx, req.Username)
	if err == nil && existingUser != nil {
		return nil, errors.NewAppError(
			errors.ErrConflict.Code,
			"User with this username already exists",
			nil,
		)
	}

	// Hash the password using bcrypt
	// bcrypt automatically generates a salt and includes it in the hash
	// DefaultCost is 10, which is a good balance between security and performance
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to hash password: %w", err))
	}

	// Create user with hashed password
	newUser := user.NewUser(req.Username, req.Email, string(hashedPassword))

	// Store user in database (password hash is stored, never the plain password)
	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to create user: %w", err))
	}

	// Return response without sensitive data
	return &SignupResponse{
		ID:        newUser.ID,
		Username:  newUser.Username,
		Email:     newUser.Email,
		CreatedAt: newUser.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

// Login authenticates a user with email/username and password
func (s *UserService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// Normalize input
	log.Println("Login request received")
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	// Validate input
	if req.Email == "" {
		return nil, errors.NewAppError(
			errors.ErrInvalidInput.Code,
			"Email is required",
			nil,
		)
	}
	if req.Password == "" {
		return nil, errors.NewAppError(
			errors.ErrInvalidInput.Code,
			"Password is required",
			nil,
		)
	}

	// Try to find user by email first
	u, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		// If not found by email, try username
		u, err = s.userRepo.GetByUsername(ctx, req.Email)
		if err != nil {
			// User not found - return unauthorized (don't reveal if email/username exists)
			return nil, errors.NewAppError(
				errors.ErrUnauthorized.Code,
				"Invalid email/username or password",
				nil,
			)
		}
	}

	// Compare the provided password with the stored hash
	// bcrypt.CompareHashAndPassword handles the comparison securely
	err = bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password))
	if err != nil {
		// Password doesn't match
		return nil, errors.NewAppError(
			errors.ErrUnauthorized.Code,
			"Invalid email/username or password",
			nil,
		)
	}

	// Password matches - generate JWT token
	token, err := auth.GenerateToken(u.ID, u.Username, u.Email)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to generate token: %w", err))
	}

	// Login successful
	return &LoginResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Token:     token,
		Message:   "Login successful",
	}, nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(ctx context.Context, userID string) (*user.User, error) {
	u, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, errors.ErrNotFound
		}
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	// Remove sensitive data
	u.PasswordHash = ""
	return u, nil
}

// LogoutResponse represents a user logout response
type LogoutResponse struct {
	Message string `json:"message"`
}

// Logout handles user logout and blacklists the token
func (s *UserService) Logout(ctx context.Context, userID string, token string) (*LogoutResponse, error) {
	// Verify user exists (optional but good for validation)
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, errors.ErrNotFound
		}
		return nil, errors.WrapError(errors.ErrInternalServer, err)
	}

	// Validate token to get expiration time
	claims, err := auth.ValidateToken(token)
	if err != nil {
		return nil, errors.WrapError(errors.ErrUnauthorized, fmt.Errorf("invalid token: %w", err))
	}

	// Get expiration time from claims
	var expiresAt time.Time
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	} else {
		// Default to 24 hours from now if expiration not set
		expiresAt = time.Now().Add(24 * time.Hour)
	}

	// Add token to blacklist
	if s.blacklistRepo != nil {
		if err := s.blacklistRepo.AddToken(ctx, token, expiresAt); err != nil {
			return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to blacklist token: %w", err))
		}
	}

	return &LogoutResponse{
		Message: "Logout successful",
	}, nil
}
