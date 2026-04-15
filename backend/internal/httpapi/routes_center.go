package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupCenterRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Use(h.RequireAuth)
		r.Get("/dashboard", h.CenterGetDashboard)
		r.Put("/profile", h.CenterUpdateProfile)
	}
}