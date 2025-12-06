package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket connection
type Client struct {
	ID         string
	UserID     string
	Username   string
	Email      string
	DocumentID string
	Conn       *websocket.Conn
	Send       chan []byte
	Hub        *Hub
}

// Message represents a WebSocket message
type Message struct {
	Type       string    `json:"type"`
	DocumentID string    `json:"document_id"`
	User       UserInfo  `json:"user"`
	Timestamp  time.Time `json:"timestamp"`
}

// UserInfo represents user information in messages
type UserInfo struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	// Map: documentID -> map[clientID]*Client
	documents map[string]map[string]*Client

	// Register requests from clients (exported for handler access)
	Register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast messages to clients
	broadcast chan *Message

	// Mutex for thread-safe access
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		documents:  make(map[string]map[string]*Client),
		Register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *Message, 256),
	}
}

// Run starts the hub's main event loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastToDocument(message)
		}
	}
}

// registerClient adds a client to a document room
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()

	// Create document room if it doesn't exist
	if h.documents[client.DocumentID] == nil {
		h.documents[client.DocumentID] = make(map[string]*Client)
	}

	// Add client to room
	h.documents[client.DocumentID][client.ID] = client
	h.mu.Unlock()

	log.Printf("Client %s (user: %s) joined document %s. Total clients: %d",
		client.ID, client.Username, client.DocumentID, len(h.documents[client.DocumentID]))

	// Broadcast JOIN message to all clients in the document (including the new one)
	joinMessage := &Message{
		Type:       "JOIN",
		DocumentID: client.DocumentID,
		User: UserInfo{
			UserID:   client.UserID,
			Username: client.Username,
			Email:    client.Email,
		},
		Timestamp: time.Now(),
	}

	// Use goroutine to avoid blocking
	go h.broadcastToDocument(joinMessage)
}

// unregisterClient removes a client and broadcasts LEAVE
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()

	clients, ok := h.documents[client.DocumentID]
	if !ok {
		h.mu.Unlock()
		return
	}

	_, exists := clients[client.ID]
	if !exists {
		h.mu.Unlock()
		return
	}

	// Broadcast LEAVE message BEFORE removing the client
	leaveMessage := &Message{
		Type:       "LEAVE",
		DocumentID: client.DocumentID,
		User: UserInfo{
			UserID:   client.UserID,
			Username: client.Username,
			Email:    client.Email,
		},
		Timestamp: time.Now(),
	}
	h.mu.Unlock()

	// Broadcast without holding the lock
	go h.broadcastToDocument(leaveMessage)

	// Now remove the client
	h.mu.Lock()
	delete(clients, client.ID)
	close(client.Send)

	// Remove document room if empty
	if len(clients) == 0 {
		delete(h.documents, client.DocumentID)
	}
	h.mu.Unlock()

	log.Printf("Client %s (user: %s) left document %s. Remaining clients: %d",
		client.ID, client.Username, client.DocumentID, len(clients))
}

// broadcastToDocument sends a message to all clients in a document
func (h *Hub) broadcastToDocument(message *Message) {
	h.mu.RLock()
	clients := h.documents[message.DocumentID]
	h.mu.RUnlock()

	if clients == nil {
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for _, client := range clients {
		select {
		case client.Send <- messageBytes:
		default:
			// Client's send channel is full, close it
			close(client.Send)
			delete(clients, client.ID)
		}
	}
}

// GetActiveUsers returns a list of active users in a document
func (h *Hub) GetActiveUsers(documentID string) []UserInfo {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients := h.documents[documentID]
	if clients == nil {
		return []UserInfo{}
	}

	users := make([]UserInfo, 0, len(clients))
	for _, client := range clients {
		users = append(users, UserInfo{
			UserID:   client.UserID,
			Username: client.Username,
			Email:    client.Email,
		})
	}

	return users
}

// ReadPump pumps messages from the websocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// For now, we just log received messages
		// In the future, this can handle EDIT messages for text synchronization
		log.Printf("Received message from client %s: %s", c.ID, string(message))
	}
}

// WritePump pumps messages from the hub to the websocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
