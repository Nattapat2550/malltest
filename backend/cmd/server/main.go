// backend/cmd/server/main.go
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"backend/internal/config"
	"backend/internal/httpapi"

	_ "github.com/lib/pq"
)

func main() {
	// 🌟 ตั้งค่า slog ให้แสดงผลเป็น JSON เพื่อให้ Render และระบบ Monitoring อ่านง่าย
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.Port
	}
	port = strings.TrimSpace(port)
	if port == "" {
		port = "5000"
	}

	mallDBUrl := os.Getenv("MALL_DB_URL")
	var mallDB *sql.DB
	if mallDBUrl != "" {
		var err error
		mallDB, err = sql.Open("postgres", mallDBUrl)
		if err != nil {
			slog.Error("Cannot connect to Mall DB", "error", err)
			os.Exit(1)
		}
		if err = mallDB.Ping(); err != nil {
			slog.Error("Mall DB ping failed", "error", err)
			os.Exit(1)
		}

		// 🌟 ตั้งค่า Connection Pool ป้องกัน DB ล่มเมื่อโหลดหนัก
		mallDB.SetMaxOpenConns(150)
		mallDB.SetMaxIdleConns(30)
		mallDB.SetConnMaxLifetime(15 * time.Minute)

		defer mallDB.Close()
		slog.Info("Connected to Mall DB successfully", "component", "backend")
	}

	srv := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           httpapi.NewRouter(cfg, mallDB),
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("Server listening", "port", port, "env", cfg.NodeEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("listen error", "error", err)
			os.Exit(1)
		}
	}()

	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	slog.Info("Server stopped gracefully")
}