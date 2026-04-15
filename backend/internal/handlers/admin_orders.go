package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminGetAllOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, user_id, total_amount, status FROM orders ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id int
		var uid string
		var total float64
		var status string
		if err := rows.Scan(&id, &uid, &total, &status); err == nil {
			orders = append(orders, map[string]any{
				"id": id, "user_id": uid, "total_amount": total, "status": status,
			})
		}
	}
	if orders == nil {
		orders = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, orders)
}

func (h *Handler) AdminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	
	var input struct {
		Status       string `json:"status"`
		StatusDetail string `json:"status_detail"`
		Location     string `json:"location"`     
	}
	
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	tx, err := h.MallDB.Begin()
	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE orders 
		SET status = $1, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $2`, 
		input.Status, orderID)

	if err != nil {
		http.Error(w, "Failed to update order status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if input.StatusDetail != "" {
		_, err = tx.Exec(`
			INSERT INTO order_tracking (order_id, status_detail, location) 
			VALUES ($1, $2, $3)`, 
			orderID, input.StatusDetail, input.Location)

		if err != nil {
			http.Error(w, "Failed to insert tracking data: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Order status and tracking updated successfully"})
}