package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

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

	// แก้ไขให้ดึง shop_id ออกมาด้วย เพื่อนำไปใช้คำนวณเงินให้ถูกร้าน
	var orderID, shopID string
	err = tx.QueryRow("SELECT order_id, shop_id FROM shipments WHERE id = $1 FOR UPDATE", req.ShipmentID).Scan(&orderID, &shopID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Shipment not found")
		return
	}

	switch role {
	case "owner", "admin":
		if req.Status == "cancelled" {
			_, err = tx.Exec("UPDATE shipments SET status = 'cancelled' WHERE id = $1", req.ShipmentID)
			if err == nil {
				_, err = tx.Exec("UPDATE orders SET status = 'cancelled' WHERE id = $1", orderID)
			}
		} else if req.Status == "shipped_to_center" && req.CenterID != nil {
			_, err = tx.Exec("UPDATE shipments SET status = 'shipped_to_center', current_center_id = $1 WHERE id = $2", *req.CenterID, req.ShipmentID)
			if err == nil {
				_, err = tx.Exec("UPDATE orders SET status = 'shipping' WHERE id = $1", orderID)
			}
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
			
			// อัปเดตสถานะออเดอร์หลัก
			if err == nil {
				_, err = tx.Exec("UPDATE orders SET status = 'completed' WHERE id = $1", orderID)
			}

			// โอนเงินให้เจ้าของร้าน
			if err == nil {
				// 1. คำนวณยอดรวมของสินค้าเฉพาะร้านนี้ (รองรับกรณีออเดอร์เดียวมีของจากหลายร้าน)
				var shopTotal float64
				err = tx.QueryRow(`
					SELECT COALESCE(SUM(oi.quantity * oi.price_at_time), 0)
					FROM order_items oi
					JOIN products p ON oi.product_id = p.id
					WHERE oi.order_id = $1 AND p.shop_id = $2
				`, orderID, shopID).Scan(&shopTotal)

				if err == nil && shopTotal > 0 {
					// 2. หา User ID ของเจ้าของร้าน
					var ownerID string
					err = tx.QueryRow("SELECT owner_id FROM shops WHERE id = $1", shopID).Scan(&ownerID)

					// 3. เพิ่มเงินเข้า Wallet ของเจ้าของร้าน (ถ้ายังไม่มีแถวข้อมูล ให้สร้างใหม่)
					if err == nil {
						_, err = tx.Exec(`
							INSERT INTO user_wallets (user_id, balance) 
							VALUES ($1, $2)
							ON CONFLICT (user_id) DO UPDATE 
							SET balance = user_wallets.balance + EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP
						`, ownerID, shopTotal)
					}
				}
			}
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