package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"github.com/go-chi/chi/v5"
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
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	if len(req.Items) == 0 {
		h.writeError(w, http.StatusBadRequest, "Order must contain at least one item")
		return
	}
	if req.Address == "" {
		h.writeError(w, http.StatusBadRequest, "Shipping address is required")
		return
	}

	// เริ่ม Transaction เพื่อความปลอดภัย
	tx, err := h.MallDB.BeginTx(r.Context(), nil)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start tx: "+err.Error())
		return
	}
	defer tx.Rollback()

	// 1. เช็คยอดเงินในกระเป๋า (FOR UPDATE ป้องกันการชนกันของข้อมูล)
	var balance float64
	err = tx.QueryRow("SELECT balance FROM user_wallets WHERE user_id = $1 FOR UPDATE", u.ID).Scan(&balance)
	if err != nil {
		if err == sql.ErrNoRows {
			balance = 0.00
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to query wallet: "+err.Error())
			return
		}
	}

	if balance < req.TotalAmount {
		h.writeError(w, http.StatusBadRequest, "ยอดเงินในกระเป๋าไม่เพียงพอ (Insufficient balance)")
		return
	}

	// 2. หักเงินในกระเป๋า
	newBalance := balance - req.TotalAmount
	_, err = tx.Exec(`
		INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2) 
		ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP`, 
		u.ID, newBalance)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to deduct balance: "+err.Error())
		return
	}

	// 3. สร้าง Order
	var orderID int
	err = tx.QueryRow(`
		INSERT INTO orders (user_id, total_amount, address, shipping_method, note, promo_code, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'paid') RETURNING id`,
		u.ID, req.TotalAmount, req.Address, req.ShippingMethod, req.Note, req.PromoCode).Scan(&orderID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create order: "+err.Error())
		return
	}

	// 4. บันทึก Order Items และตัดสต็อกสินค้า
	for _, item := range req.Items {
		_, err = tx.Exec("INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)",
			orderID, item.ProductID, item.Quantity, item.Price)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to insert order item: "+err.Error())
			return
		}

		res, err := tx.Exec("UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1", item.Quantity, item.ProductID)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to update stock: "+err.Error())
			return
		}
		
		affected, _ := res.RowsAffected()
		if affected == 0 {
			h.writeError(w, http.StatusBadRequest, "สินค้าบางรายการหมด หรือมีสต็อกไม่เพียงพอ")
			return
		}
	}

	if err = tx.Commit(); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to commit tx: "+err.Error())
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"status":      "success",
		"message":     "Order placed successfully",
		"order_id":    orderID,
		"new_balance": newBalance,
	})
}

// backend/internal/handlers/order.go

// GetMyOrders ดึงรายการสั่งซื้อทั้งหมดของ User ที่ Logged in อยู่
func (h *Handler) GetMyOrders(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	rows, err := h.MallDB.Query("SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY id DESC", userID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id int
		var total float64
		var status string
		var createdAt any
		if err := rows.Scan(&id, &total, &status, &createdAt); err == nil {
			orders = append(orders, map[string]any{
				"id": id, "total_amount": total, "status": status, "created_at": createdAt,
			})
		}
	}
	WriteJSON(w, http.StatusOK, orders)
}

// GetOrderTracking ดึงประวัติการเดินทางของคำสั่งซื้อนั้นๆ
func (h *Handler) GetOrderTracking(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	// ตรวจสอบก่อนว่าเป็นเจ้าของ Order จริงไหม
	var ownerID string
	err := h.MallDB.QueryRow("SELECT user_id FROM orders WHERE id = $1", orderID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		h.writeError(w, http.StatusForbidden, "คุณไม่มีสิทธิ์ดูข้อมูลนี้")
		return
	}

	rows, err := h.MallDB.Query("SELECT status_detail, location, created_at FROM order_tracking WHERE order_id = $1 ORDER BY created_at DESC", orderID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var tracking []map[string]any
	for rows.Next() {
		var detail, location string
		var createdAt any
		if err := rows.Scan(&detail, &location, &createdAt); err == nil {
			tracking = append(tracking, map[string]any{
				"detail": detail, "location": location, "time": createdAt,
			})
		}
	}
	WriteJSON(w, http.StatusOK, tracking)
}