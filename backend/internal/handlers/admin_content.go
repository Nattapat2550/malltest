package handlers

import (
	"net/http"
)

// --- News ---
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, title, content, COALESCE(image_url, '') FROM news ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var newsList []map[string]any
	for rows.Next() {
		var id int
		var title, content, img string
		if err := rows.Scan(&id, &title, &content, &img); err == nil {
			newsList = append(newsList, map[string]any{
				"id": id, "title": title, "content": content, "image_url": img,
			})
		}
	}
	if newsList == nil {
		newsList = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, newsList)
}

func (h *Handler) AdminCreateNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusCreated) }
func (h *Handler) AdminUpdateNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
func (h *Handler) AdminDeleteNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }

// --- Carousel ---
func (h *Handler) AdminGetCarousel(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, image_url, COALESCE(link_url, ''), is_active, sort_order FROM carousels ORDER BY sort_order ASC, id DESC")
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
				"id": id, "image_url": img, "link_url": link, "is_active": isActive, "sort_order": sort,
			})
		}
	}
	if items == nil {
		items = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) AdminUpdateCarousel(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Carousel updated"})
}