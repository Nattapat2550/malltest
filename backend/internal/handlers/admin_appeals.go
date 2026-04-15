package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminGetAppeals(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, user_id, topic, message, status FROM appeals ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var appeals []map[string]any
	for rows.Next() {
		var id int
		var uid, topic, msg, status string 
		if err := rows.Scan(&id, &uid, &topic, &msg, &status); err == nil {
			appeals = append(appeals, map[string]any{
				"id": id, "user_id": uid, "topic": topic, "message": msg, "status": status,
			})
		}
	}
	if appeals == nil {
		appeals = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, appeals)
}

func (h *Handler) AdminUpdateAppealStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status string `json:"status"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input data")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), "UPDATE appeals SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update appeal status")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Appeal status updated"})
}

func (h *Handler) AdminDeleteAppeal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM appeals WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete appeal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}