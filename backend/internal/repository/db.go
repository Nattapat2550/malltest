package repository

import (
	"database/sql"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	connStr := os.Getenv("CONCERT_DB_URL") // ใช้ URL ตัวแปรเดิมเพื่อไม่ให้กระทบ Environment ปกติ
	if connStr == "" {
		log.Fatal("Database URL not set in .env")
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Connection Pool Settings สำหรับรองรับ High Traffic
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err = DB.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	log.Println("Database connected successfully.")
}