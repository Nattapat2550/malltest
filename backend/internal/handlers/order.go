package handlers

import (
	"encoding/json"
	"net/http"
)

type OrderItem struct {
	ProductID int     `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

type OrderRequest struct {
	Items          []OrderItem `json:"items"`
	Address        string      `json:"address"`
	ShippingMethod string      `json:"shipping_method"`
	Note           string      `json:"note"`
	PromoCode      string      `json:"promo_code"`
	TotalAmount    float64     `json:"total_amount"`
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	var req OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if len(req.Items) == 0 {
		http.Error(w, "Order must contain at least one item", http.StatusBadRequest)
		return
	}
	if req.Address == "" {
		http.Error(w, "Shipping address is required", http.StatusBadRequest)
		return
	}

	// อนาคตสามารถเพิ่ม Logic ตัดสต็อกใน DB ตรงนี้

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"message":  "Order placed successfully",
		"order_id": 9999,
	})
}

func (h *Handler) GetMyOrders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	// จำลองส่งข้อมูล Array เปล่ากลับไปก่อน
	json.NewEncoder(w).Encode([]interface{}{})
}