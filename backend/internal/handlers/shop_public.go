package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) GetShopByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var shop struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		BannerURL   string `json:"banner_url"`
	}

	var desc, banner sql.NullString
	err := h.MallDB.QueryRow("SELECT id, name, description, banner_url FROM shops WHERE id = $1", id).Scan(&shop.ID, &shop.Name, &desc, &banner)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Shop not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	if desc.Valid {
		shop.Description = desc.String
	}
	if banner.Valid {
		shop.BannerURL = banner.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shop)
}

func (h *Handler) GetShopProductsPublic(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value 
		FROM products 
		WHERE shop_id = $1 AND is_active = TRUE 
		ORDER BY created_at DESC
	`, id)

	if err != nil {
		http.Error(w, "Database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var desc, img, mediaJSON, catID, shopID, pID, vType, vValue sql.NullString

		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &shopID, &img, &mediaJSON, &pID, &vType, &vValue); err != nil {
			continue
		}

		if desc.Valid { p.Description = desc.String }
		if img.Valid { p.ImageURL = img.String }
		if catID.Valid { cid := catID.String; p.CategoryID = &cid }
		if shopID.Valid { sid := shopID.String; p.ShopID = &sid }
		if pID.Valid && pID.String != "" { pidStr := pID.String; p.ParentID = &pidStr }
		if vType.Valid && vType.String != "" { vTypeStr := vType.String; p.VariantType = &vTypeStr }
		if vValue.Valid && vValue.String != "" { vValStr := vValue.String; p.VariantValue = &vValStr }
		if mediaJSON.Valid && mediaJSON.String != "" {
			json.Unmarshal([]byte(mediaJSON.String), &p.Media)
		}
		if p.Media == nil {
			p.Media = []Media{}
		}

		products = append(products, p)
	}

	if products == nil {
		products = []Product{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}