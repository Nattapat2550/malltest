// backend/internal/httpapi/routes_admin.go
package httpapi

import (
	"github.com/go-chi/chi/v5"

	"backend/internal/handlers"
)

func setupAdminRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		// Middleware บังคับให้ต้อง Login และเป็น Admin (Super Admin)
		r.Use(h.RequireAuth)
		r.Use(h.RequireAdmin)

		// --- User Management ---
		r.Get("/users", h.AdminGetUsers)
		r.Put("/users/{id}/role", h.AdminUpdateUserRole)

		// --- Product Management (Shopping Mall) ---
		r.Get("/products", h.AdminGetProducts)
		r.Post("/products", h.AdminCreateProduct)
		r.Put("/products/{id}", h.AdminUpdateProduct)
		r.Delete("/products/{id}", h.AdminDeleteProduct)

		// --- Order & Sales Management ---
		r.Get("/orders", h.AdminGetAllOrders)
		r.Put("/orders/{id}/status", h.AdminUpdateOrderStatus)

		// --- Content & Support Management ---
		r.Get("/news", h.AdminGetNewsList)
		r.Post("/news", h.AdminCreateNews)
		r.Put("/news/{id}", h.AdminUpdateNews)
		r.Delete("/news/{id}", h.AdminDeleteNews)
		
		r.Get("/appeals", h.AdminGetAppeals) 
		r.Put("/appeals/{id}", h.AdminUpdateAppealStatus)
		r.Delete("/appeals/{id}", h.AdminDeleteAppeal)

		r.Get("/carousel", h.AdminGetCarousel)
		r.Post("/carousel", h.AdminUpdateCarousel)
		r.Put("/users/{id}/wallet", h.UpdateUserWallet)
	}
}