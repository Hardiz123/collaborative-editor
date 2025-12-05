package routes

import (
	"net/http"

	"collaborative-editor/internal/handlers"
	"collaborative-editor/internal/middleware"
)

// SetupRoutes configures all application routes
func SetupRoutes(userHandler *handlers.UserHandler) {
	// Public routes
	http.HandleFunc("/signup", userHandler.Signup)
	http.HandleFunc("/login", userHandler.Login)

	// Protected routes (require JWT authentication)
	http.Handle("/protected", middleware.AuthMiddleware(http.HandlerFunc(handlers.ProtectedHandler)))

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}
