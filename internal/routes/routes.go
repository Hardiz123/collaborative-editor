package routes

import (
	"net/http"

	"collaborative-editor/internal/handlers"
	"collaborative-editor/internal/middleware"
)

// SetupRoutes configures all application routes
func SetupRoutes(userHandler *handlers.UserHandler, textHandler *handlers.TextHandler, docHandler *handlers.DocumentHandler) {
	// ============================================
	// Public Routes
	// ============================================
	setupPublicRoutes(userHandler)

	// ============================================
	// Protected Routes (require JWT authentication)
	// ============================================
	setupProtectedRoutes(userHandler, textHandler, docHandler)

	// ============================================
	// System Routes
	// ============================================
	setupSystemRoutes()
}

// setupPublicRoutes configures public (unauthenticated) routes
func setupPublicRoutes(userHandler *handlers.UserHandler) {
	// User authentication routes
	http.Handle("/signup", middleware.CORSMiddleware(http.HandlerFunc(userHandler.Signup)))
	http.Handle("/login", middleware.CORSMiddleware(http.HandlerFunc(userHandler.Login)))
}

// setupProtectedRoutes configures protected (authenticated) routes
func setupProtectedRoutes(userHandler *handlers.UserHandler, textHandler *handlers.TextHandler, docHandler *handlers.DocumentHandler) {
	// User routes
	http.Handle("/getUser", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(userHandler.GetUserHandler))))
	http.Handle("/protected", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(handlers.ProtectedHandler))))
	http.Handle("/logout", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(userHandler.LogoutHandler))))

	// Text routes
	http.Handle("/saveText", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(textHandler.SaveText))))
	http.Handle("/getText", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(textHandler.GetText))))

	// Document routes
	// Using Go 1.22+ routing patterns for method and path matching
	// We need to explicitly handle OPTIONS for CORS since method-specific matches don't match OPTIONS
	http.Handle("OPTIONS /documents", middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})))
	http.Handle("OPTIONS /documents/{id}", middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})))
	http.Handle("OPTIONS /documents/{id}/collaborators", middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})))

	http.Handle("POST /documents", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.CreateDocument))))
	http.Handle("GET /documents", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.ListDocuments))))
	http.Handle("GET /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.GetDocument))))
	http.Handle("PUT /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.UpdateDocument))))
	http.Handle("DELETE /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.DeleteDocument))))
	http.Handle("POST /documents/{id}/collaborators", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.AddCollaborator))))
}

// setupSystemRoutes configures system-level routes
func setupSystemRoutes() {
	// Health check
	http.Handle("/health", middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})))
}
