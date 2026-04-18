// backend/internal/handlers/admin_content.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

// --- News ---
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	// เพิ่มการดึง is_active และ created_at พร้อมใส่ COALESCE ป้องกันค่า NULL
	rows, err := h.MallDB.Query(`
		SELECT 
			id, 
			COALESCE(title, ''), 
			COALESCE(content, ''), 
			COALESCE(image_url, ''), 
			COALESCE(is_active, true),
			COALESCE(created_at, NOW())
		FROM news 
		ORDER BY id DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var newsList []map[string]any
	for rows.Next() {
		var id int
		var title, content, img string
		var isActive bool
		var createdAt time.Time

		if err := rows.Scan(&id, &title, &content, &img, &isActive, &createdAt); err == nil {
			newsList = append(newsList, map[string]any{
				"id":         id, 
				"title":      title, 
				"content":    content, 
				"image_url":  img,
				"is_active":  isActive,
				"created_at": createdAt.Format(time.RFC3339),
			})
		} else {
			log.Println("Error scanning news row:", err)
		}
	}
	if newsList == nil {
		newsList = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, newsList)
}

func (h *Handler) AdminCreateNews(w http.ResponseWriter, r *http.Request) {
	var n struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		ImageURL string `json:"image_url"`
		IsActive bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(),
		"INSERT INTO news (title, content, image_url, is_active) VALUES ($1, $2, $3, $4)",
		n.Title, n.Content, n.ImageURL, n.IsActive, 
	)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create news")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "News created successfully"})
}

func (h *Handler) AdminUpdateNews(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var n struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		ImageURL string `json:"image_url"`
		IsActive bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	// แก้ไขให้ใช้ค่า n.IsActive ที่ส่งมาจากหน้าบ้านแทนการล็อกเป็น true
	_, err = h.MallDB.ExecContext(r.Context(),
		"UPDATE news SET title = $1, content = $2, image_url = $3, is_active = $4 WHERE id = $5",
		n.Title, n.Content, n.ImageURL, n.IsActive, id, 
	)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update news")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "News updated successfully"})
}

func (h *Handler) AdminDeleteNews(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	_, err = h.MallDB.ExecContext(r.Context(), "DELETE FROM news WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete news")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "News deleted successfully"})
}

// --- Carousel ---
func (h *Handler) AdminGetCarousel(w http.ResponseWriter, r *http.Request) {
	// เพิ่ม COALESCE ปกป้องค่า NULL ให้ครบทุกคอลัมน์ ป้องกัน Scan error
	rows, err := h.MallDB.Query(`
		SELECT 
			id, 
			COALESCE(image_url, ''), 
			COALESCE(link_url, ''), 
			COALESCE(is_active, true), 
			COALESCE(sort_order, 0) 
		FROM carousels 
		ORDER BY sort_order ASC, id DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	
	var items []map[string]any
	for rows.Next() {
		var id, sort int
		var img, link string
		var isActive bool

		if err := rows.Scan(&id, &img, &link, &isActive, &sort); err == nil {
			items = append(items, map[string]any{
				"id":         id, 
				"image_url":  img, 
				"link_url":   link, 
				"is_active":  isActive, 
				"sort_order": sort,
			})
		} else {
			log.Println("Error scanning carousel row:", err)
		}
	}
	if items == nil { 
		items = []map[string]any{} 
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) AdminCreateCarousel(w http.ResponseWriter, r *http.Request) {
	var c struct {
		ImageURL  string `json:"image_url"`
		LinkURL   string `json:"link_url"`
		SortOrder int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(),
		"INSERT INTO carousels (image_url, link_url, sort_order, is_active) VALUES ($1, $2, $3, true)",
		c.ImageURL, c.LinkURL, c.SortOrder,
	)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create carousel")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Created successfully"})
}

func (h *Handler) AdminUpdateCarousel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.Atoi(idStr)

	var c struct {
		ImageURL  string `json:"image_url"`
		LinkURL   string `json:"link_url"`
		SortOrder int    `json:"sort_order"`
		IsActive  bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(),
		"UPDATE carousels SET image_url=$1, link_url=$2, sort_order=$3, is_active=$4 WHERE id=$5",
		c.ImageURL, c.LinkURL, c.SortOrder, c.IsActive, id,
	)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated successfully"})
}

func (h *Handler) AdminDeleteCarousel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.Atoi(idStr)
	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM carousels WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Deleted successfully"})
}