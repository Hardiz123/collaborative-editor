package main

import (
	"log"
	"net/http"

	"collaborative-editor/internal/db"
	"collaborative-editor/internal/handlers"
	"collaborative-editor/internal/repository"
	"collaborative-editor/internal/routes"
	"collaborative-editor/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file (if it exists)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to Couchbase
	if err := db.Connect(); err != nil {
		log.Fatalf("Failed to connect to Couchbase: %v", err)
	}
	defer db.Close()

	// Initialize repository layer
	userRepo := repository.NewCouchbaseUserRepository()

	// Initialize service layer
	userService := services.NewUserService(userRepo)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService)

	// Setup routes
	routes.SetupRoutes(userHandler)

	log.Println("Server starting at http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
