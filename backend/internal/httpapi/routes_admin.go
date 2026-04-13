// backend/internal/httpapi/routes_admin.go
package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupAdminRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		// Middleware บังคับให้ต้อง Login และเป็น Admin
		r.Use(h.RequireAuth)
		r.Use(h.RequireAdmin)

		// -----------------------------------------------------------
		// หมายเหตุ: คอมเมนต์ฟังก์ชันเหล่านี้ไว้ก่อน เพื่อให้โปรเจครันผ่าน 100%
		// เมื่อคุณสร้างฟังก์ชันเหล่านี้ในโฟลเดอร์ internal/handlers/ เสร็จแล้ว
		// ค่อยมาเอาเครื่องหมาย // ด้านหน้าออกเพื่อเปิดใช้งาน Endpoint ครับ
		// -----------------------------------------------------------

		/*
		// --- User Management ---
		r.Get("/users", h.AdminGetUsers)
		r.Put("/users/{id}/role", h.AdminUpdateUserRole)

		// --- Product Management (แทนที่ Concerts/Venues เดิม) ---
		r.Route("/products", func(r chi.Router) {
			r.Get("/", h.AdminGetProducts)
			r.Post("/", h.AdminCreateProduct)
			r.Put("/{id}", h.AdminUpdateProduct)
			r.Delete("/{id}", h.AdminDeleteProduct)
		})

		// --- Order & Sales Management (แทนที่ Bookings เดิม) ---
		r.Route("/orders", func(r chi.Router) {
			r.Get("/", h.AdminGetAllOrders)
			r.Put("/{id}/status", h.AdminUpdateOrderStatus)
		})

		// --- Content Management (คงระบบ News/Carousel เดิมไว้) ---
		r.Route("/content", func(r chi.Router) {
			r.Get("/news", h.AdminGetNewsList)
			r.Post("/news", h.AdminCreateNews)
			r.Put("/news/{id}", h.AdminUpdateNews)
			r.Delete("/news/{id}", h.AdminDeleteNews)
			
			r.Get("/carousel", h.AdminGetCarousel)
			r.Post("/carousel", h.AdminUpdateCarousel)
		})
		*/
	}
}