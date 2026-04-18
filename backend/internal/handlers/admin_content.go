// backend/internal/handlers/admin_content.go
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// --- News ---
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query(`
		SELECT id, title, content, image_url, is_active, created_at
		FROM news 
		ORDER BY created_at DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var newsList []map[string]any
	for rows.Next() {
		// แก้เป็น string เพื่อให้รับ UUID ได้
		var id string
		var title, content, img sql.NullString
		var isActive sql.NullBool
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &title, &content, &img, &isActive, &createdAt); err == nil {
			
			createdAtStr := time.Now().Format(time.RFC3339)
			if createdAt.Valid {
				createdAtStr = createdAt.Time.Format(time.RFC3339)
			}
			
			active := true
			if isActive.Valid {
				active = isActive.Bool
			}

			newsList = append(newsList, map[string]any{
				"id":         id, 
				"title":      title.String, 
				"content":    content.String, 
				"image_url":  img.String,
				"is_active":  active,
				"created_at": createdAtStr,
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
	// ID เป็น UUID string อยู่แล้ว ไม่ต้องแปลงเป็น int
	id := chi.URLParam(r, "id")

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
	id := chi.URLParam(r, "id")

	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM news WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete news")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "News deleted successfully"})
}

// --- Carousel ---
func (h *Handler) AdminGetCarousel(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query(`
		SELECT id, image_url, link_url, is_active, sort_order
		FROM carousels 
		ORDER BY sort_order ASC, created_at DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	
	var items []map[string]any
	for rows.Next() {
		// แก้เป็น string เพื่อรับ UUID
		var id string
		var img, link sql.NullString
		var isActive sql.NullBool
		var sortOrder sql.NullInt64

		if err := rows.Scan(&id, &img, &link, &isActive, &sortOrder); err == nil {
			active := true
			if isActive.Valid {
				active = isActive.Bool
			}

			items = append(items, map[string]any{
				"id":         id, 
				"image_url":  img.String, 
				"link_url":   link.String, 
				"is_active":  active, 
				"sort_order": int(sortOrder.Int64),
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
	id := chi.URLParam(r, "id")

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
	id := chi.URLParam(r, "id")
	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM carousels WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Deleted successfully"})
}