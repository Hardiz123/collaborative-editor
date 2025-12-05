package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/middleware"
	"collaborative-editor/internal/services"
)

// UserHandler handles HTTP requests for user operations
type UserHandler struct {
	userService *services.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// Signup handles user registration
func (h *UserHandler) Signup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, errors.NewAppError(
			http.StatusMethodNotAllowed,
			"Method not allowed",
			nil,
		))
		return
	}

	var req services.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	// Call service
	response, err := h.userService.Signup(r.Context(), &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusCreated, response)
}

// Login handles user authentication
func (h *UserHandler) Login(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		respondWithError(w, errors.NewAppError(
			http.StatusMethodNotAllowed,
			"Method not allowed",
			nil,
		))
		return
	}

	var req services.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, errors.WrapError(errors.ErrInvalidInput, err))
		return
	}

	// Call service
	response, err := h.userService.Login(r.Context(), &req)
	if err != nil {
		respondWithError(w, err)
		return
	}

	respondWithJSON(w, http.StatusOK, response)
}

// respondWithJSON sends a JSON response
func respondWithJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}

// respondWithError sends an error response
func respondWithError(w http.ResponseWriter, err error) {
	appErr, ok := err.(*errors.AppError)
	if !ok {
		appErr = errors.ErrInternalServer
	}

	log.Printf("Error: %v", err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.Code)
	json.NewEncoder(w).Encode(map[string]string{
		"error": appErr.Message,
	})
}

// GetUserHandler handles requests to get user information
func (h *UserHandler) GetUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, errors.NewAppError(
			http.StatusMethodNotAllowed,
			"Method not allowed",
			nil,
		))
		return
	}

	user, err := h.userService.GetUser(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		respondWithError(w, err)
		return
	}

	log.Println("User ID: ", user)

	respondWithJSON(w, http.StatusOK, map[string]string{
		"userID":   user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}
