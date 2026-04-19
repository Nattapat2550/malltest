package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CenterGetDashboard(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var center struct {
		ID   string `json:"id"`
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
			var sID, oID string
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
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var req struct { Name string `json:"name"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var centerID string
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

// ==== ส่วนจัดการ Riders ประจำศูนย์ ====
func (h *Handler) CenterGetRiders(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var centerID string
	err := h.MallDB.QueryRow("SELECT id FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&centerID)
	if err != nil { http.Error(w, "Center not found", http.StatusForbidden); return }

	rows, err := h.MallDB.Query("SELECT id, rider_user_id, created_at FROM riders WHERE center_id = $1", centerID)
	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
	defer rows.Close()

	var riders []map[string]any
	for rows.Next() {
		var id, rUID string
		var ca any
		rows.Scan(&id, &rUID, &ca)
		riders = append(riders, map[string]any{"id": id, "rider_user_id": rUID, "created_at": ca})
	}
	if riders == nil { riders = []map[string]any{} }
	WriteJSON(w, http.StatusOK, riders)
}

func (h *Handler) CenterAddRider(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var centerID string
	err := h.MallDB.QueryRow("SELECT id FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&centerID)
	if err != nil { http.Error(w, "Center not found", http.StatusForbidden); return }

	var req struct { RiderUserID string `json:"rider_user_id"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "Invalid input", http.StatusBadRequest); return }

	// Upsert หากมี user_id นี้อยู่แล้วให้เปลี่ยน center_id
	_, err = h.MallDB.Exec(`
		INSERT INTO riders (rider_user_id, center_id) VALUES ($1, $2)
		ON CONFLICT (rider_user_id) DO UPDATE SET center_id = EXCLUDED.center_id
	`, req.RiderUserID, centerID)
	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Rider added successfully"})
}

func (h *Handler) CenterRemoveRider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var centerID string
	err := h.MallDB.QueryRow("SELECT id FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&centerID)
	if err != nil { http.Error(w, "Center not found", http.StatusForbidden); return }

	_, err = h.MallDB.Exec("DELETE FROM riders WHERE id = $1 AND center_id = $2", id, centerID)
	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Rider removed"})
}

func (h *Handler) CenterBatchAssign(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var center struct { ID, Name string }
	err := h.MallDB.QueryRow("SELECT id, name FROM delivery_centers WHERE center_user_id = $1", uidStr).Scan(&center.ID, &center.Name)
	if err != nil { http.Error(w, "Center not found", http.StatusForbidden); return }

	var req struct {
		ShipmentIDs []string `json:"shipment_ids"`
		RiderID     string   `json:"rider_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "Invalid input", http.StatusBadRequest); return }

	// ไม่ใช้ Transaction เพื่อความเรียบง่ายและกันล็อกข้าม Table มากเกินไป
	for _, sid := range req.ShipmentIDs {
		_, err := h.MallDB.Exec("UPDATE shipments SET status='delivering', rider_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND current_center_id=$3 AND status='at_center'", req.RiderID, sid, center.ID)
		if err == nil {
			var orderID string
			h.MallDB.QueryRow("SELECT order_id FROM shipments WHERE id=$1", sid).Scan(&orderID)
			h.MallDB.Exec("INSERT INTO order_tracking (order_id, status_detail, location) VALUES ($1, $2, $3)",
				orderID, "พัสดุกำลังถูกนำจ่ายโดยพนักงานจัดส่ง (Batch)", center.Name)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Batch assignment successful"})
}