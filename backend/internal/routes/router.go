package routes

import (
	"net/http"
	"backend/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func SetupRouter() http.Handler {
	r := chi.NewRouter()

	// การตั้งค่า CORS ให้ครอบคลุม Frontend URL ทั้งหมด
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://gtymalltest.onrender.com", "http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/auth/google", handlers.GoogleOAuthLogin)
		
		r.Get("/products", handlers.GetProducts)
		r.Post("/checkout", handlers.Checkout)
	})

	return r
}