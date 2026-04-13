package handlers

import (
	"encoding/json"
	"net/http"
)

// เปลี่ยนชื่อจาก HealthCheck เป็น Health ให้ตรงกับที่ router.go เรียกใช้
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"message": "Shopping Mall API is running",
	})
}