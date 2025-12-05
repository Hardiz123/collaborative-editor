package handlers

import (
	"net/http"
)

// ProtectedHandler handles protected routes that require authentication
func ProtectedHandler(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Welcome to the protected route",
	})
}
