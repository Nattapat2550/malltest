package handlers

import (
	"encoding/json"
	"net/http"
)

type OrderHandler struct {}

func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	// 1. ดึง user_id จาก Context ที่ Set ไว้ใน auth_middleware.go
	// 2. Decode JSON body เพื่อดึงรายการสินค้าในตะกร้า (Cart Items)
	// 3. เริ่ม Database Transaction (tx)
	// 4. ลูปเช็คสต็อกสินค้า: SELECT stock FROM products WHERE id = ? FOR UPDATE
	// 5. ถ้าสต็อกพอ -> หักสต็อก (UPDATE products SET stock = stock - quantity)
	// 6. ถ้ามี user_wallets -> หักเงิน
	// 7. Insert ลงตาราง orders และ order_items
	// 8. Commit Transaction หรือ Rollback หากเกิด Error

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Order placed successfully",
	})
}
// --- Public Order Routes ---
func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func (h *Handler) GetMyOrders(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}