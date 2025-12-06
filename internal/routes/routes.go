package routes

import (
	"net/http"

	"collaborative-editor/internal/handlers"
	"collaborative-editor/internal/middleware"
)

// SetupRoutes configures all application routes
func SetupRoutes(userHandler *handlers.UserHandler, textHandler *handlers.TextHandler, docHandler *handlers.DocumentHandler, wsHandler *handlers.WebSocketHandler) {
	// ============================================
	// Public Routes
	// ============================================
	setupPublicRoutes(userHandler)

	// ============================================
	// Protected Routes (require JWT authentication)
	// ============================================
	setupProtectedRoutes(userHandler, textHandler, docHandler)

	// ============================================
	// WebSocket Routes
	// ============================================
	setupWebSocketRoutes(wsHandler)

	// ============================================
	// System Routes
	// ============================================
	setupSystemRoutes()
}

// registerOPTIONS is a helper to register OPTIONS handlers for CORS preflight
func registerOPTIONS(paths ...string) {
	for _, path := range paths {
		http.Handle("OPTIONS "+path, middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})))
	}
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
	// Register OPTIONS handlers for CORS preflight
	registerOPTIONS("/documents", "/documents/{id}", "/documents/{id}/collaborators")

	http.Handle("POST /documents", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.CreateDocument))))
	http.Handle("GET /documents", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.ListDocuments))))
	http.Handle("GET /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.GetDocument))))
	http.Handle("PUT /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.UpdateDocument))))
	http.Handle("DELETE /documents/{id}", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.DeleteDocument))))
	http.Handle("POST /documents/{id}/collaborators", middleware.CORSMiddleware(middleware.AuthMiddleware(http.HandlerFunc(docHandler.AddCollaborator))))
}

// setupWebSocketRoutes configures WebSocket routes
func setupWebSocketRoutes(wsHandler *handlers.WebSocketHandler) {
	// WebSocket endpoint for real-time collaboration
	// Note: WebSocket upgrade doesn't work well with AuthMiddleware, so we handle auth inside the handler
	http.Handle("GET /ws/documents/{id}", middleware.CORSMiddleware(http.HandlerFunc(wsHandler.HandleWebSocket)))
}

// setupSystemRoutes configures system-level routes
func setupSystemRoutes() {
	// Health check
	http.Handle("/health", middleware.CORSMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})))
}
