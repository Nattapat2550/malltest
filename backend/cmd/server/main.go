package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/httpapi"
)

func main() {
	setupLogger()

	cfg := config.Load()
	port := getPort(cfg.Port)

	// 1. Initialize Database
	mallDB := database.InitDB(os.Getenv("MALL_DB_URL"))
	if mallDB != nil {
		defer mallDB.Close()
	}

	// 2. Setup HTTP Server
	srv := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           httpapi.NewRouter(cfg, mallDB),
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	// 3. Start Server with Graceful Shutdown
	startServer(srv, port, cfg.NodeEnv)
}

func setupLogger() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
}

func getPort(configPort string) string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = configPort
	}
	if port == "" {
		port = "5000"
	}
	return port
}

func startServer(srv *http.Server, port, env string) {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("Server listening", "port", port, "env", env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("listen error", "error", err)
			os.Exit(1)
		}
	}()

	<-stop
	slog.Info("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server shutdown failed", "error", err)
	} else {
		slog.Info("Server stopped cleanly")
	}
}