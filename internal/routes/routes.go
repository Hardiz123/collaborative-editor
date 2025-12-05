package routes

import (
	"net/http"

	"collaborative-editor/internal/handlers"
)

// SetupRoutes configures all application routes
func SetupRoutes(userHandler *handlers.UserHandler) {
	// User routes
	http.HandleFunc("/signup", userHandler.Signup)

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}
