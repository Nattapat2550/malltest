package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
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

	uidStr := fmt.Sprintf("%v", u.ID)
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

	var orderID int
	err = tx.QueryRow(`
		INSERT INTO orders (user_id, total_amount, address, shipping_method, note, promo_code, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'paid') RETURNING id`,
		uidStr, req.TotalAmount, req.Address, req.ShippingMethod, req.Note, req.PromoCode).Scan(&orderID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}

	shopMap := make(map[int]bool)

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

		var shopID sql.NullInt64
		err = tx.QueryRow("SELECT shop_id FROM products WHERE id = $1", item.ProductID).Scan(&shopID)
		if err == nil && shopID.Valid {
			shopMap[int(shopID.Int64)] = true
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

	uidStr := fmt.Sprintf("%v", u.ID)
	rows, err := h.MallDB.QueryContext(r.Context(),
		"SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY id DESC", uidStr)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "เกิดข้อผิดพลาดในการดึงข้อมูล")
		return
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id int
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
					var itemId, productId, qty int
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

	uidStr := fmt.Sprintf("%v", u.ID)
	var id int
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
			var itemId, productId, qty int
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

	var ownerID string
	err := h.MallDB.QueryRow("SELECT user_id FROM orders WHERE id = $1", orderID).Scan(&ownerID)
	
	if err != nil || ownerID != fmt.Sprintf("%v", u.ID) {
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

func (h *Handler) UpdateShipmentState(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	uidStr := fmt.Sprintf("%v", u.ID)

	var req ShipmentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var role string
	err := h.MallDB.QueryRow("SELECT role FROM user_roles WHERE user_id = $1", uidStr).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows { role = "customer" } else {
			h.writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	tx, err := h.MallDB.Begin()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var orderID int
	err = tx.QueryRow("SELECT order_id FROM shipments WHERE id = $1 FOR UPDATE", req.ShipmentID).Scan(&orderID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Shipment not found")
		return
	}

	switch role {
	case "owner", "admin":
		if req.Status == "cancelled" {
			_, err = tx.Exec("UPDATE shipments SET status = 'cancelled' WHERE id = $1", req.ShipmentID)
		} else if req.Status == "shipped_to_center" && req.CenterID != nil {
			_, err = tx.Exec("UPDATE shipments SET status = 'shipped_to_center', current_center_id = $1 WHERE id = $2", *req.CenterID, req.ShipmentID)
		}
	case "center":
		if req.Status == "at_center" {
			_, err = tx.Exec("UPDATE shipments SET status = 'at_center' WHERE id = $1", req.ShipmentID)
		} else if req.Status == "delivering" && req.RiderID != nil {
			_, err = tx.Exec("UPDATE shipments SET status = 'delivering', rider_id = $1 WHERE id = $2", *req.RiderID, req.ShipmentID)
		} else if req.Status == "shipped_to_center" && req.CenterID != nil {
			_, err = tx.Exec("UPDATE shipments SET status = 'shipped_to_center', current_center_id = $1 WHERE id = $2", *req.CenterID, req.ShipmentID)
		}
	case "rider":
		if req.Status == "completed" {
			_, err = tx.Exec("UPDATE shipments SET status = 'completed' WHERE id = $1", req.ShipmentID)
		}
	default:
		h.writeError(w, http.StatusForbidden, "Role not authorized to update shipments")
		return
	}

	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update shipment status")
		return
	}

	_, err = tx.Exec("INSERT INTO order_tracking (order_id, status_detail, location) VALUES ($1, $2, $3)", 
		orderID, req.TrackingDetail, req.Location)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to add tracking")
		return
	}

	tx.Commit()
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Shipment updated successfully"})
}

// =========================================================================
// API สำหรับ Center (ศูนย์กระจายสินค้า)
// =========================================================================

func (h *Handler) CenterGetDashboard(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var center struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}

	err := h.MallDB.QueryRow("SELECT id, name FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&center.ID, &center.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"has_center": false})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows, err := h.MallDB.Query(`
		SELECT s.id, s.status, o.id, o.address, s.updated_at
		FROM shipments s
		JOIN orders o ON s.order_id = o.id
		WHERE s.current_center_id = $1
		ORDER BY s.updated_at DESC
	`, center.ID)

	var shipments []map[string]any
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var sID, oID int
			var status, address string
			var updatedAt any
			rows.Scan(&sID, &status, &oID, &address, &updatedAt)
			shipments = append(shipments, map[string]any{
				"shipment_id": sID,
				"status": status,
				"order_id": oID,
				"address": address,
				"updated_at": updatedAt,
			})
		}
	}
	if shipments == nil { shipments = []map[string]any{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"has_center": true,
		"center": center,
		"shipments": shipments,
	})
}

func (h *Handler) CenterUpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var centerID int
	err := h.MallDB.QueryRow("SELECT id FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&centerID)
	switch err {
	case sql.ErrNoRows:
		_, err = h.MallDB.Exec("INSERT INTO delivery_centers (center_user_id, name) VALUES ($1, $2)", uidStr, req.Name)
	case nil:
		_, err = h.MallDB.Exec("UPDATE delivery_centers SET name = $1 WHERE id = $2", req.Name, centerID)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Center profile updated successfully"})
}