package handlers

import (
	"log"
	"net/http"
)

// GET /api/homepage
func (h *Handler) HomepageGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var data any
	
	// พยายามดึงข้อมูลจาก Pure API
	if err := h.Pure.Get(ctx, "/api/internal/homepage/list", &data); err != nil {
		// หากดึงข้อมูลล้มเหลว (เช่น 401 จากการลืมใส่ PURE_API_KEY)
		// ให้ Log เตือนไว้ แต่คืนค่าเป็น 200 OK และ Object ว่างให้ Frontend แทนเพื่อไม่ให้หน้าเว็บพัง
		log.Printf("⚠️ Warning: Failed to fetch homepage data from Pure API: %v", err)
		WriteJSON(w, http.StatusOK, map[string]any{})
		return
	}

	// กรณีดึงมาได้แต่ข้อมูลเป็น null ให้ส่ง object เปล่า
	if data == nil {
		WriteJSON(w, http.StatusOK, map[string]any{})
		return
	}

	WriteJSON(w, http.StatusOK, data)
}

// PUT /api/homepage  (admin only)
func (h *Handler) HomepageUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload map[string]any
	
	if err := ReadJSON(r, &payload); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	
	var data any
	if err := h.Pure.Post(ctx, "/api/internal/homepage/update", payload, &data); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	
	WriteJSON(w, http.StatusOK, data)
}