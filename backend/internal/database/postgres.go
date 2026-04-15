package database

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func InitDB(dbURL string) *sql.DB {
	if dbURL == "" {
		slog.Warn("MALL_DB_URL is empty. Server starting without database connection.")
		return nil
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		slog.Error("Cannot connect to Mall DB", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err = db.PingContext(ctx); err != nil {
		slog.Error("Mall DB ping failed", "error", err)
		os.Exit(1)
	}

	// Connection Pool Settings ป้องกัน DB ล่ม
	db.SetMaxOpenConns(150)
	db.SetMaxIdleConns(30)
	db.SetConnMaxLifetime(15 * time.Minute)

	slog.Info("Connected to Mall DB successfully", "component", "database")
	return db
}