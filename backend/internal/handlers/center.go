package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func (h *Handler) CenterGetDashboard(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	
	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
	
	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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