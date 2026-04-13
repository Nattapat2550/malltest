package main

import (
	"log"
	"net/http"
	"os"

	"shopping-mall/internal/routes"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	router := routes.SetupRouter()

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}