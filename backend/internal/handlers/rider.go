package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func (h *Handler) RiderGetDashboard(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	
	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var riderID int

	// ค้นหา Rider ในระบบ ถ้ายังไม่เคยมีบันทึก ให้สร้างขึ้นมาอัตโนมัติ
	err := h.MallDB.QueryRow("SELECT id FROM riders WHERE rider_user_id = $1", uidStr).Scan(&riderID)
	if err != nil {
		if err == sql.ErrNoRows {
			errInsert := h.MallDB.QueryRow("INSERT INTO riders (rider_user_id) VALUES ($1) RETURNING id", uidStr).Scan(&riderID)
			if errInsert != nil {
				http.Error(w, errInsert.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// ดึงรายการพัสดุที่ถูกจ่ายงานมาให้ Rider คนนี้
	rows, err := h.MallDB.Query(`
		SELECT s.id, s.status, o.id, o.address, o.user_id, s.updated_at
		FROM shipments s
		JOIN orders o ON s.order_id = o.id
		WHERE s.rider_id = $1
		ORDER BY s.updated_at DESC
	`, riderID)

	var shipments []map[string]any
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var sID, oID int
			var status, address, customerID string
			var updatedAt any
			rows.Scan(&sID, &status, &oID, &address, &customerID, &updatedAt)
			shipments = append(shipments, map[string]any{
				"shipment_id": sID,
				"status": status,
				"order_id": oID,
				"address": address,
				"customer_id": customerID,
				"updated_at": updatedAt,
			})
		}
	}
	if shipments == nil { shipments = []map[string]any{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"rider_id": riderID,
		"shipments": shipments,
	})
}