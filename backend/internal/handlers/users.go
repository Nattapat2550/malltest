package handlers

import (
	"database/sql"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func (h *Handler) UsersMeGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var me userDTO
	if err := h.Pure.Post(ctx, "/api/internal/find-user", map[string]any{"id": u.ID}, &me); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	
	if me.Status != nil && *me.Status == "deleted" {
		h.clearAuthCookie(w)
		h.writeError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// แทรก Role ในการตอบกลับด้วย
	var role string
	err := h.MallDB.QueryRow("SELECT role FROM user_roles WHERE user_id = $1", u.ID).Scan(&role)
	if err != nil {
		role = "customer" // Default
	}

	response := map[string]any{
		"user": me,
		"role": role,
	}

	WriteJSON(w, http.StatusOK, response)
}

func (h *Handler) UsersMePut(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body map[string]any
	if err := ReadJSON(r, &body); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	payload := map[string]any{"id": u.ID}
	for k, v := range body {
		payload[k] = v
	}

	var updated userDTO
	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, &updated); err != nil {
		if isUsernameUniqueViolation(err) {
			h.writeError(w, http.StatusConflict, "Username already taken")
			return
		}
		h.writeErrFrom(w, err)
		return
	}

	if status, ok := body["status"].(string); ok && status == "deleted" {
		h.clearAuthCookie(w)
	}

	WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) UsersMeAvatar(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	if err := r.ParseMultipartForm(4 * 1024 * 1024); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid form")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "No file")
		return
	}
	defer file.Close()

	mime := strings.ToLower(strings.TrimSpace(header.Header.Get("Content-Type")))
	if !strings.HasPrefix(mime, "image/") || !allowedImageMime(mime) {
		h.writeError(w, http.StatusBadRequest, "Invalid file type")
		return
	}

	b, err := io.ReadAll(file)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Read failed")
		return
	}
	if int64(len(b)) > 4*1024*1024 {
		h.writeError(w, http.StatusBadRequest, "File too large")
		return
	}

	dataURL := fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(b))

	payload := map[string]any{
		"id":                  u.ID,
		"profile_picture_url": dataURL,
	}

	var updated userDTO
	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, &updated); err != nil {
		h.writeErrFrom(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":                  true,
		"profile_picture_url": updated.ProfilePictureURL,
	})
}

func (h *Handler) UsersMeDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	payload := map[string]any{
		"id":     u.ID,
		"status": "deleted",
	}

	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, nil); err != nil {
		h.writeErrFrom(w, err)
		return
	}

	h.clearAuthCookie(w)
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "message": "Account has been soft-deleted"})
}

func (h *Handler) GetUserWallet(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var balance float64
	err := h.MallDB.QueryRow("SELECT balance FROM user_wallets WHERE user_id = $1", u.ID).Scan(&balance)
	if err != nil {
		if err == sql.ErrNoRows {
			balance = 0.00 
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to fetch wallet balance")
			return
		}
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"user_id": u.ID,
		"balance": balance,
	})
}

// ===== จัดการ Addresses ของ User =====
func (h *Handler) GetUserAddresses(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	rows, err := h.MallDB.Query("SELECT id, title, address, is_default, created_at FROM user_addresses WHERE user_id = $1 ORDER BY id DESC", u.ID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var addresses []UserAddress
	for rows.Next() {
		var a UserAddress
		a.UserID = fmt.Sprintf("%v", u.ID)
		if err := rows.Scan(&a.ID, &a.Title, &a.Address, &a.IsDefault, &a.CreatedAt); err == nil {
			addresses = append(addresses, a)
		}
	}
	if addresses == nil {
		addresses = []UserAddress{}
	}

	WriteJSON(w, http.StatusOK, addresses)
}

func (h *Handler) AddUserAddress(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Title   string `json:"title"`
		Address string `json:"address"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	_, err := h.MallDB.Exec("INSERT INTO user_addresses (user_id, title, address) VALUES ($1, $2, $3)", u.ID, req.Title, req.Address)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to add address")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Address added successfully"})
}