package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupProductRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Get("/", h.ListProducts)
		r.Get("/{id}", h.GetProductByID)
		r.Get("/{id}/comments", h.GetProductComments)

		r.Group(func(r chi.Router) {
			r.Use(h.RequireAuth)
			r.Post("/{id}/comments", h.CreateProductComment)
			r.Patch("/{id}/comments/{commentID}", h.UpdateProductComment)
			r.Delete("/{id}/comments/{commentID}", h.DeleteProductComment)
		})

		r.Group(func(r chi.Router) {
			r.Use(h.RequireAuth)
			r.Use(h.RequireAdmin)
			r.Post("/", h.CreateProduct)
			r.Put("/{id}", h.UpdateProduct)
			r.Delete("/{id}", h.DeleteProduct)
		})
	}
}