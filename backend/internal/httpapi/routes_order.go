package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupOrderRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Use(h.RequireAuth)
		r.Post("/checkout", h.Checkout)
		r.Get("/", h.GetMyOrders)
		r.Get("/{id}", h.GetOrderByID)
		r.Get("/{id}/tracking", h.GetOrderTracking)
		r.Put("/shipments/status", h.UpdateShipmentState) 
	}
}