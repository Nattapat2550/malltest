package main

import (
	"log"
	"net/http"
	"os"

	"backend/internal/repository"
	"backend/internal/routes"
	"backend/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	// โหลดตัวแปรสภาพแวดล้อม
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// 1. ตรวจสอบการเชื่อมต่อ Database
	repository.InitDB()

	// 2. เริ่มต้นการทำงานของ Queue Worker (รับโหลดการซื้อ)
	services.StartWorker()

	// 3. เริ่มต้น Router
	router := routes.SetupRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	// 4. สตาร์ท Server
	log.Printf("E-Commerce API Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}