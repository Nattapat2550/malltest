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
			// ยกเลิกออเดอร์ด้วย หากร้านกดยกเลิก
			if err == nil {
				_, err = tx.Exec("UPDATE orders SET status = 'cancelled' WHERE id = $1", orderID)
			}
		} else if req.Status == "shipped_to_center" && req.CenterID != nil {
			_, err = tx.Exec("UPDATE shipments SET status = 'shipped_to_center', current_center_id = $1 WHERE id = $2", *req.CenterID, req.ShipmentID)
			// เปลี่ยนสถานะออเดอร์เป็นกำลังจัดส่ง (shipping) เมื่อร้านจัดส่ง
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
			// เปลี่ยนสถานะออเดอร์เป็นจัดส่งสำเร็จ (completed) เมื่อไรเดอร์จัดส่งเสร็จ
			if err == nil {
				_, err = tx.Exec("UPDATE orders SET status = 'completed' WHERE id = $1", orderID)
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