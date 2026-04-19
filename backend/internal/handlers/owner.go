package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) OwnerGetShop(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shop struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		BannerURL   string `json:"banner_url"`
	}
	var desc, banner sql.NullString
	err := h.MallDB.QueryRow("SELECT id, name, description, banner_url FROM shops WHERE owner_id = $1", uidStr).Scan(&shop.ID, &shop.Name, &desc, &banner)
	
	if err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"has_shop": false})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if desc.Valid { shop.Description = desc.String }
	if banner.Valid { shop.BannerURL = banner.String }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"has_shop": true, "shop": shop})
}

func (h *Handler) OwnerUpdateShop(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		BannerURL   string `json:"banner_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	switch err {
	case sql.ErrNoRows:
		_, err = h.MallDB.Exec("INSERT INTO shops (owner_id, name, description, banner_url) VALUES ($1, $2, $3, $4)", uidStr, req.Name, req.Description, req.BannerURL)
	case nil:
		_, err = h.MallDB.Exec("UPDATE shops SET name = $1, description = $2, banner_url = $3 WHERE id = $4", req.Name, req.Description, req.BannerURL, shopID)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Shop updated successfully"})
}

func (h *Handler) OwnerGetProducts(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Product{})
		return
	}

	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value 
		FROM products WHERE shop_id = $1 ORDER BY created_at DESC
	`, shopID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var desc, img, mediaJSON, catID, sID, pID, vType, vValue sql.NullString

		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &sID, &img, &mediaJSON, &pID, &vType, &vValue); err != nil { continue }
		
		if desc.Valid { p.Description = desc.String }
		if img.Valid { p.ImageURL = img.String }
		if catID.Valid { cid := catID.String; p.CategoryID = &cid }
		if sID.Valid { sid := sID.String; p.ShopID = &sid }
		if pID.Valid && pID.String != "" { pidStr := pID.String; p.ParentID = &pidStr }
		if vType.Valid && vType.String != "" { vTypeStr := vType.String; p.VariantType = &vTypeStr }
		if vValue.Valid && vValue.String != "" { vValStr := vValue.String; p.VariantValue = &vValStr }
		if mediaJSON.Valid && mediaJSON.String != "" { json.Unmarshal([]byte(mediaJSON.String), &p.Media) }
		if p.Media == nil { p.Media = []Media{} }
		products = append(products, p)
	}
	if products == nil { products = []Product{} }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *Handler) OwnerCreateProduct(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { http.Error(w, "Shop not found", http.StatusForbidden); return }

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { http.Error(w, "Invalid input", http.StatusBadRequest); return }

	mediaBytes, _ := json.Marshal(p.Media)
	_, err = h.MallDB.Exec(`
		INSERT INTO products (sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, shopID, p.ImageURL, string(mediaBytes), p.ParentID, p.VariantType, p.VariantValue)

	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Product created successfully"})
}

func (h *Handler) OwnerUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { http.Error(w, "Shop not found", http.StatusForbidden); return }

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { http.Error(w, "Invalid input", http.StatusBadRequest); return }

	mediaBytes, _ := json.Marshal(p.Media)
	res, err := h.MallDB.Exec(`
		UPDATE products 
		SET sku=$1, name=$2, description=$3, price=$4, stock=$5, image_url=$6, media_urls=$7, parent_id=$8, variant_type=$9, variant_value=$10, updated_at=CURRENT_TIMESTAMP
		WHERE id=$11 AND shop_id=$12`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.ImageURL, string(mediaBytes), p.ParentID, p.VariantType, p.VariantValue, id, shopID)

	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
	affected, _ := res.RowsAffected()
	if affected == 0 { http.Error(w, "Product not found or you don't own it", http.StatusForbidden); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Product updated successfully"})
}

func (h *Handler) OwnerDeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { http.Error(w, "Shop not found", http.StatusForbidden); return }

	res, err := h.MallDB.Exec("DELETE FROM products WHERE id = $1 AND shop_id = $2", id, shopID)
	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
	affected, _ := res.RowsAffected()
	if affected == 0 { http.Error(w, "Product not found or you don't own it", http.StatusForbidden); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Product deleted successfully"})
}

func (h *Handler) OwnerGetOrders(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { http.Error(w, "Shop not found", http.StatusForbidden); return }

	rows, err := h.MallDB.Query(`
		SELECT s.id as shipment_id, s.status as shipment_status, o.id as order_id, o.user_id, o.address, o.created_at
		FROM shipments s JOIN orders o ON s.order_id = o.id WHERE s.shop_id = $1 ORDER BY s.created_at DESC
	`, shopID)
	if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var shipmentID, orderID string
		var shipmentStatus, userID, address string
		var createdAt any

		if err := rows.Scan(&shipmentID, &shipmentStatus, &orderID, &userID, &address, &createdAt); err == nil {
			itemRows, errItem := h.MallDB.Query(`SELECT oi.quantity, p.name, p.price, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1 AND p.shop_id = $2`, orderID, shopID)
			var items []map[string]any
			if errItem == nil {
				for itemRows.Next() {
					var qty int
					var name string
					var price float64
					var img sql.NullString
					itemRows.Scan(&qty, &name, &price, &img)
					items = append(items, map[string]any{"name": name, "quantity": qty, "price": price, "image_url": img.String})
				}
				itemRows.Close()
			}
			results = append(results, map[string]any{"shipment_id": shipmentID, "shipment_status": shipmentStatus, "order_id": orderID, "user_id": userID, "address": address, "created_at": createdAt, "items": items})
		}
	}
	if results == nil { results = []map[string]any{} }
	WriteJSON(w, http.StatusOK, results)
}

// ==== ระบบจัดการโปรโมชั่นของร้านค้า ====
func (h *Handler) OwnerGetPromotions(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { WriteJSON(w, http.StatusOK, []Promotion{}); return }

	rows, err := h.MallDB.Query("SELECT id, code, description, discount_type, discount_value, max_discount, min_purchase, usage_limit, used_count, start_date, end_date, is_active FROM promotions WHERE shop_id = $1 ORDER BY created_at DESC", shopID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, err.Error()); return }
	defer rows.Close()

	var promos []Promotion
	for rows.Next() {
		var p Promotion
		if err := rows.Scan(&p.ID, &p.Code, &p.Description, &p.DiscountType, &p.DiscountValue, &p.MaxDiscount, &p.MinPurchase, &p.UsageLimit, &p.UsedCount, &p.StartDate, &p.EndDate, &p.IsActive); err == nil {
			p.ShopID = &shopID
			promos = append(promos, p)
		}
	}
	if promos == nil { promos = []Promotion{} }
	WriteJSON(w, http.StatusOK, promos)
}

func (h *Handler) OwnerCreatePromotion(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { h.writeError(w, http.StatusForbidden, "Shop not found"); return }

	var p Promotion
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid request"); return }

	_, err = h.MallDB.Exec("INSERT INTO promotions (code, description, discount_type, discount_value, max_discount, min_purchase, usage_limit, start_date, end_date, is_active, shop_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
		p.Code, p.Description, p.DiscountType, p.DiscountValue, p.MaxDiscount, p.MinPurchase, p.UsageLimit, p.StartDate, p.EndDate, p.IsActive, shopID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed to create: "+err.Error()); return }
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

func (h *Handler) OwnerUpdatePromotion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { h.writeError(w, http.StatusForbidden, "Shop not found"); return }

	var p Promotion
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid request"); return }

	res, err := h.MallDB.Exec("UPDATE promotions SET code=$1, description=$2, discount_type=$3, discount_value=$4, max_discount=$5, min_purchase=$6, usage_limit=$7, start_date=$8, end_date=$9, is_active=$10 WHERE id=$11 AND shop_id=$12",
		p.Code, p.Description, p.DiscountType, p.DiscountValue, p.MaxDiscount, p.MinPurchase, p.UsageLimit, p.StartDate, p.EndDate, p.IsActive, id, shopID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, err.Error()); return }
	affected, _ := res.RowsAffected()
	if affected == 0 { h.writeError(w, http.StatusForbidden, "Promotion not found"); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "success"})
}

func (h *Handler) OwnerDeletePromotion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := u.UserID
	if uidStr == "" { uidStr = fmt.Sprintf("%v", u.ID) }

	var shopID string
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil { h.writeError(w, http.StatusForbidden, "Shop not found"); return }

	res, err := h.MallDB.Exec("DELETE FROM promotions WHERE id=$1 AND shop_id=$2", id, shopID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, err.Error()); return }
	affected, _ := res.RowsAffected()
	if affected == 0 { h.writeError(w, http.StatusForbidden, "Promotion not found"); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "success"})
}