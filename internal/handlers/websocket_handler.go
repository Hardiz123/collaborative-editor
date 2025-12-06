package handlers

import (
	"log"
	"net/http"
	"strings"

	"collaborative-editor/internal/errors"
	"collaborative-editor/internal/middleware"
	"collaborative-editor/internal/repository"
	"collaborative-editor/internal/services"
	ws "collaborative-editor/internal/websocket"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// In production, check against allowed origins
		return true
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub        *ws.Hub
	docService *services.DocumentService
	userRepo   repository.UserRepository
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *ws.Hub, docService *services.DocumentService, userRepo repository.UserRepository) *WebSocketHandler {
	return &WebSocketHandler{
		hub:        hub,
		docService: docService,
		userRepo:   userRepo,
	}
}

// HandleWebSocket upgrades HTTP connection to WebSocket
func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract document ID from path
	documentID := r.PathValue("id")
	if documentID == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	// Authenticate user - try query param first, then header
	token := r.URL.Query().Get("token")
	if token == "" {
		// Try Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if token == "" {
		http.Error(w, "Authentication token required", http.StatusUnauthorized)
		return
	}

	// Validate token and get user ID
	userID, err := middleware.ValidateToken(token)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Get user details
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// Verify user has access to the document
	_, err = h.docService.GetDocument(r.Context(), userID, documentID)
	if err != nil {
		if appErr, ok := err.(*errors.AppError); ok && appErr.Code == errors.ErrForbidden.Code {
			http.Error(w, "Access denied to this document", http.StatusForbidden)
			return
		}
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Create client
	client := &ws.Client{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		Username:   user.Username,
		Email:      user.Email,
		DocumentID: documentID,
		Conn:       conn,
		Send:       make(chan []byte, 256),
		Hub:        h.hub,
	}

	// Register client with hub
	h.hub.Register <- client

	// Start read and write pumps in goroutines
	go client.WritePump()
	go client.ReadPump()

	log.Printf("WebSocket connection established for user %s (%s) on document %s",
		user.Username, user.ID, documentID)
}
