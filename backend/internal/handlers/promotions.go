package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type Promotion struct {
	ID            string     `json:"id"`
	Code          string     `json:"code"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"` // fixed, percent, free_shipping
	DiscountValue float64    `json:"discount_value"`
	MaxDiscount   *float64   `json:"max_discount"`
	MinPurchase   float64    `json:"min_purchase"`
	UsageLimit    int        `json:"usage_limit"`
	UsedCount     int        `json:"used_count"`
	StartDate     time.Time  `json:"start_date"`
	EndDate       *time.Time `json:"end_date"`
	IsActive      bool       `json:"is_active"`
	ShopID        *string    `json:"shop_id"` // เพิ่มฟิลด์
	CreatedAt     time.Time  `json:"created_at"`
}

func (h *Handler) AdminGetPromotions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, code, description, discount_type, discount_value, max_discount, min_purchase, usage_limit, used_count, start_date, end_date, is_active, shop_id, created_at FROM promotions ORDER BY created_at DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var promos []Promotion
	for rows.Next() {
		var p Promotion
		var shopID sql.NullString
		if err := rows.Scan(&p.ID, &p.Code, &p.Description, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinPurchase, &p.UsageLimit, &p.UsedCount, &p.StartDate, &p.EndDate, &p.IsActive, &shopID, &p.CreatedAt); err == nil {
			if shopID.Valid { p.ShopID = &shopID.String }
			promos = append(promos, p)
		}
	}
	if promos == nil { promos = []Promotion{} }
	WriteJSON(w, http.StatusOK, promos)
}

func (h *Handler) AdminCreatePromotion(w http.ResponseWriter, r *http.Request) {
	var p Promotion
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	_, err := h.MallDB.Exec("INSERT INTO promotions (code, description, discount_type, discount_value, max_discount, min_purchase, usage_limit, start_date, end_date, is_active, shop_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
		p.Code, p.Description, p.DiscountType, p.DiscountValue, p.MaxDiscount, p.MinPurchase, p.UsageLimit, p.StartDate, p.EndDate, p.IsActive, p.ShopID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create: "+err.Error())
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

func (h *Handler) AdminUpdatePromotion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Promotion
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	_, err := h.MallDB.Exec("UPDATE promotions SET code=$1, description=$2, discount_type=$3, discount_value=$4, max_discount=$5, min_purchase=$6, usage_limit=$7, start_date=$8, end_date=$9, is_active=$10, shop_id=$11 WHERE id=$12",
		p.Code, p.Description, p.DiscountType, p.DiscountValue, p.MaxDiscount, p.MinPurchase, p.UsageLimit, p.StartDate, p.EndDate, p.IsActive, p.ShopID, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update: "+err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "success"})
}

func (h *Handler) AdminDeletePromotion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.MallDB.Exec("DELETE FROM promotions WHERE id=$1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "success"})
}

func (h *Handler) AdminGetPromotionUsers(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.MallDB.Query("SELECT user_id, is_used, collected_at, used_at FROM user_promotions WHERE promotion_id = $1 ORDER BY collected_at DESC", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var users []map[string]any
	for rows.Next() {
		var uid string
		var isUsed bool
		var colAt time.Time
		var usedAt sql.NullTime
		if err := rows.Scan(&uid, &isUsed, &colAt, &usedAt); err == nil {
			users = append(users, map[string]any{
				"user_id": uid, "is_used": isUsed, "collected_at": colAt, "used_at": usedAt.Time,
			})
		}
	}
	if users == nil { users = []map[string]any{} }
	WriteJSON(w, http.StatusOK, users)
}

func (h *Handler) GetActivePromotions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, code, description, discount_type, discount_value, max_discount, min_purchase, usage_limit, used_count, shop_id, start_date, end_date FROM promotions WHERE is_active = TRUE AND start_date <= CURRENT_TIMESTAMP AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var promos []Promotion
	for rows.Next() {
		var p Promotion
		var shopID sql.NullString
		if err := rows.Scan(&p.ID, &p.Code, &p.Description, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinPurchase, &p.UsageLimit, &p.UsedCount, &shopID, &p.StartDate, &p.EndDate); err == nil {
			if shopID.Valid { p.ShopID = &shopID.String }
			promos = append(promos, p)
		}
	}
	if promos == nil { promos = []Promotion{} }
	WriteJSON(w, http.StatusOK, promos)
}

func (h *Handler) CollectPromotion(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var req struct { PromotionID string `json:"promotion_id"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	
	var usageLimit, usedCount int
	err := h.MallDB.QueryRow("SELECT usage_limit, used_count FROM promotions WHERE id = $1 AND is_active = TRUE", req.PromotionID).Scan(&usageLimit, &usedCount)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "โปรโมชั่นไม่ถูกต้องหรือหมดอายุ")
		return
	}
	if usageLimit > 0 && usedCount >= usageLimit {
		h.writeError(w, http.StatusBadRequest, "สิทธิ์เต็มแล้ว ไม่สามารถเก็บเพิ่มได้")
		return
	}

	_, err = h.MallDB.Exec("INSERT INTO user_promotions (user_id, promotion_id) VALUES ($1, $2)", u.UserID, req.PromotionID)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "คุณเก็บโค้ดนี้ไปแล้ว")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "เก็บโค้ดสำเร็จ"})
}

func (h *Handler) GetMyPromotions(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	rows, err := h.MallDB.Query(`
		SELECT p.id, p.code, p.description, p.discount_type, p.discount_value, p.max_discount, p.min_purchase, up.is_used, p.shop_id 
		FROM user_promotions up 
		JOIN promotions p ON up.promotion_id = p.id 
		WHERE up.user_id = $1 AND p.is_active = TRUE AND p.start_date <= CURRENT_TIMESTAMP AND (p.end_date IS NULL OR p.end_date >= CURRENT_TIMESTAMP)
	`, u.UserID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var promos []map[string]any
	for rows.Next() {
		var id, code, desc, dType string
		var dVal, minPur float64
		var maxD sql.NullFloat64
		var isUsed bool
		var shopID sql.NullString
		if err := rows.Scan(&id, &code, &desc, &dType, &dVal, &maxD, &minPur, &isUsed, &shopID); err == nil {
			var sID *string
			if shopID.Valid { sID = &shopID.String }
			promos = append(promos, map[string]any{
				"id": id, "code": code, "description": desc, "discount_type": dType, 
				"discount_value": dVal, "max_discount": maxD.Float64, "min_purchase": minPur, "is_used": isUsed, "shop_id": sID,
			})
		}
	}
	if promos == nil { promos = []map[string]any{} }
	WriteJSON(w, http.StatusOK, promos)
}