package routes

import (
	"net/http"

	"collaborative-editor/internal/handlers"
	"collaborative-editor/internal/middleware"
)

// SetupRoutes configures all application routes
func SetupRoutes(userHandler *handlers.UserHandler, textHandler *handlers.TextHandler) {
	// ============================================
	// Public Routes
	// ============================================
	setupPublicRoutes(userHandler)

	// ============================================
	// Protected Routes (require JWT authentication)
	// ============================================
	setupProtectedRoutes(userHandler, textHandler)

	// ============================================
	// System Routes
	// ============================================
	setupSystemRoutes()
}

// setupPublicRoutes configures public (unauthenticated) routes
func setupPublicRoutes(userHandler *handlers.UserHandler) {
	// User authentication routes
	http.HandleFunc("/signup", userHandler.Signup)
	http.HandleFunc("/login", userHandler.Login)
}

// setupProtectedRoutes configures protected (authenticated) routes
func setupProtectedRoutes(userHandler *handlers.UserHandler, textHandler *handlers.TextHandler) {
	// User routes
	http.Handle("/getUser", middleware.AuthMiddleware(http.HandlerFunc(userHandler.GetUserHandler)))
	http.Handle("/protected", middleware.AuthMiddleware(http.HandlerFunc(handlers.ProtectedHandler)))
	http.Handle("/logout", middleware.AuthMiddleware(http.HandlerFunc(userHandler.LogoutHandler)))

	// Text routes
	http.Handle("/saveText", middleware.AuthMiddleware(http.HandlerFunc(textHandler.SaveText)))
	http.Handle("/getText", middleware.AuthMiddleware(http.HandlerFunc(textHandler.GetText)))
}

// setupSystemRoutes configures system-level routes
func setupSystemRoutes() {
	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}
