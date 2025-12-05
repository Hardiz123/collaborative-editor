package services

import (
	"context"
	"fmt"
	"strings"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/repository"
	"collaborative-editor/internal/validation"
	"collaborative-editor/pkg/user"

	"golang.org/x/crypto/bcrypt"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo repository.UserRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
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

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.WrapError(errors.ErrInternalServer, fmt.Errorf("failed to hash password: %w", err))
	}

	// Create user
	newUser := user.NewUser(req.Username, req.Email, string(hashedPassword))

	// Store user in database
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
