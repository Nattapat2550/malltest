package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateProductComment(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	var req CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var isValidOrder bool
	err := h.MallDB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM orders o
			JOIN order_items oi ON o.id = oi.order_id
			WHERE o.id = $1 
			  AND o.user_id = $2 
			  AND oi.product_id = $3 
			  AND o.status = 'completed'
		)
	`, req.OrderID, userID, productID).Scan(&isValidOrder)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !isValidOrder {
		http.Error(w, "คุณไม่สามารถคอมเมนต์สินค้านี้ได้", http.StatusForbidden)
		return
	}

	_, err = h.MallDB.Exec(`
		INSERT INTO product_comments (product_id, user_id, order_id, rating, message) 
		VALUES ($1, $2, $3, $4, $5)
	`, productID, userID, req.OrderID, req.Rating, req.Message)

	if err != nil {
		http.Error(w, "คุณได้คอมเมนต์ไปแล้ว หรือมีข้อผิดพลาด: "+err.Error(), http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment added successfully"})
}

func (h *Handler) UpdateProductComment(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentID")
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	var req struct {
		Rating  int    `json:"rating"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "ข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	result, err := h.MallDB.Exec(`
		UPDATE product_comments 
		SET rating = $1, message = $2, created_at = NOW() 
		WHERE id = $3 AND user_id = $4
	`, req.Rating, req.Message, commentID, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "ไม่พบคอมเมนต์หรือคุณไม่มีสิทธิ์แก้ไข", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "แก้ไขคอมเมนต์สำเร็จ"})
}

func (h *Handler) DeleteProductComment(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentID")
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	result, err := h.MallDB.Exec("DELETE FROM product_comments WHERE id = $1 AND user_id = $2", commentID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "ไม่พบคอมเมนต์หรือไม่มีสิทธิ์ลบ", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}