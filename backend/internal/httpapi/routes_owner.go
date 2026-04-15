package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupOwnerRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Use(h.RequireAuth)
		r.Get("/shop", h.OwnerGetShop)
		r.Put("/shop", h.OwnerUpdateShop)
		r.Get("/products", h.OwnerGetProducts)
		r.Post("/products", h.OwnerCreateProduct)
		r.Put("/products/{id}", h.OwnerUpdateProduct)
		r.Delete("/products/{id}", h.OwnerDeleteProduct)
		r.Get("/orders", h.OwnerGetOrders)
	}
}