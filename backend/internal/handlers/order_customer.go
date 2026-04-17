package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type OrderItem struct {
	ProductID string  `json:"product_id"`
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

	if len(req.Items) == 0 || req.Address == "" {
		h.writeError(w, http.StatusBadRequest, "Order must contain items and address")
		return
	}

	tx, err := h.MallDB.BeginTx(r.Context(), nil)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start tx: "+err.Error())
		return
	}
	defer tx.Rollback()

	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var balance float64
	err = tx.QueryRow("SELECT balance FROM user_wallets WHERE user_id = $1 FOR UPDATE", uidStr).Scan(&balance)
	if err != nil {
		if err == sql.ErrNoRows { balance = 0.00 } else {
			h.writeError(w, http.StatusInternalServerError, "Failed to query wallet")
			return
		}
	}

	if balance < req.TotalAmount {
		h.writeError(w, http.StatusBadRequest, "ยอดเงินในกระเป๋าไม่เพียงพอ (Insufficient balance)")
		return
	}

	newBalance := balance - req.TotalAmount
	_, err = tx.Exec(`
		INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2) 
		ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP`,
		uidStr, newBalance)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to deduct balance")
		return
	}

	var orderID string
	err = tx.QueryRow(`
		INSERT INTO orders (user_id, total_amount, address, shipping_method, note, promo_code, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'paid') RETURNING id`,
		uidStr, req.TotalAmount, req.Address, req.ShippingMethod, req.Note, req.PromoCode).Scan(&orderID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}

	shopMap := make(map[string]bool)

	for _, item := range req.Items {
		_, err = tx.Exec("INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)",
			orderID, item.ProductID, item.Quantity, item.Price)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to insert order item")
			return
		}

		res, err := tx.Exec("UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1", item.Quantity, item.ProductID)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to update stock")
			return
		}

		affected, _ := res.RowsAffected()
		if affected == 0 {
			h.writeError(w, http.StatusBadRequest, "สินค้าบางรายการหมด หรือมีสต็อกไม่เพียงพอ")
			return
		}

		var shopID sql.NullString
		err = tx.QueryRow("SELECT shop_id FROM products WHERE id = $1", item.ProductID).Scan(&shopID)
		if err == nil && shopID.Valid {
			shopMap[shopID.String] = true
		}
	}

	for sID := range shopMap {
		_, err = tx.Exec("INSERT INTO shipments (order_id, shop_id, status) VALUES ($1, $2, 'pending')", orderID, sID)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to create shipment")
			return
		}
	}

	_, err = tx.Exec("INSERT INTO order_tracking (order_id, status_detail, location) VALUES ($1, 'ระบบได้รับคำสั่งซื้อและชำระเงินเรียบร้อยแล้ว', 'System')", orderID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to add initial tracking")
		return
	}

	if err = tx.Commit(); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to commit tx")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"status":      "success",
		"message":     "Order placed successfully",
		"order_id":    orderID,
		"new_balance": newBalance,
	})
}

func (h *Handler) GetMyOrders(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "ไม่พบข้อมูลผู้ใช้งาน")
		return
	}

	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	rows, err := h.MallDB.QueryContext(r.Context(),
		"SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC", uidStr)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "เกิดข้อผิดพลาดในการดึงข้อมูล")
		return
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id string
		var total float64
		var status string
		var createdAt interface{}

		if err := rows.Scan(&id, &total, &status, &createdAt); err == nil {
			itemRows, errItem := h.MallDB.QueryContext(r.Context(), `
				SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.price_at_time, p.image_url
				FROM order_items oi
				JOIN products p ON oi.product_id = p.id
				WHERE oi.order_id = $1`, id)
			
			var items []map[string]any
			if errItem == nil {
				for itemRows.Next() {
					var itemId, productId string
					var qty int
					var productName string
					var price float64
					var sqlImageUrl sql.NullString 
					
					if err := itemRows.Scan(&itemId, &productId, &productName, &qty, &price, &sqlImageUrl); err == nil {
						items = append(items, map[string]any{
							"id":           itemId,
							"product_id":   productId,
							"product_name": productName,
							"quantity":     qty,
							"price":        price,
							"image_url":    sqlImageUrl.String,
						})
					}
				}
				itemRows.Close()
			}
			if items == nil { items = []map[string]any{} }

			orders = append(orders, map[string]any{
				"id":           id,
				"total_amount": total,
				"status":       status,
				"created_at":   createdAt,
				"items":        items, 
			})
		}
	}
	if orders == nil { orders = []map[string]any{} }
	WriteJSON(w, http.StatusOK, orders)
}

func (h *Handler) GetOrderByID(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "ไม่พบข้อมูลผู้ใช้งาน")
		return
	}

	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var id string
	var total float64
	var status string
	var createdAt interface{}

	err := h.MallDB.QueryRowContext(r.Context(),
		"SELECT id, total_amount, status, created_at FROM orders WHERE id = $1 AND user_id = $2",
		orderID, uidStr).Scan(&id, &total, &status, &createdAt)
	
	if err != nil {
		if err == sql.ErrNoRows {
			h.writeError(w, http.StatusNotFound, "ไม่พบคำสั่งซื้อ")
		} else {
			h.writeError(w, http.StatusInternalServerError, "เกิดข้อผิดพลาด: "+err.Error())
		}
		return
	}

	itemRows, err := h.MallDB.QueryContext(r.Context(), `
		SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.price_at_time, p.image_url
		FROM order_items oi
		JOIN products p ON oi.product_id = p.id
		WHERE oi.order_id = $1`, id)
	
	var items []map[string]any
	if err == nil {
		for itemRows.Next() {
			var itemId, productId string
			var qty int
			var productName string
			var price float64
			var sqlImageUrl sql.NullString
			
			if err := itemRows.Scan(&itemId, &productId, &productName, &qty, &price, &sqlImageUrl); err == nil {
				items = append(items, map[string]any{
					"id":           itemId,
					"product_id":   productId,
					"product_name": productName,
					"quantity":     qty,
					"price":        price,
					"image_url":    sqlImageUrl.String,
				})
			}
		}
		itemRows.Close()
	}
	if items == nil { items = []map[string]any{} }

	WriteJSON(w, http.StatusOK, map[string]any{
		"id":           id,
		"total_amount": total,
		"status":       status,
		"created_at":   createdAt,
		"items":        items,
	})
}

func (h *Handler) GetOrderTracking(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "ไม่พบข้อมูลผู้ใช้งาน")
		return
	}

	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var ownerID string
	err := h.MallDB.QueryRow("SELECT user_id FROM orders WHERE id = $1", orderID).Scan(&ownerID)
	
	if err != nil || ownerID != uidStr {
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