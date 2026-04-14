// backend/internal/handlers/product.go
package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// ListProducts ดึงรายการสินค้าทั้งหมดไปโชว์ที่หน้าเว็บ (Public)
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	if h.MallDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Database not connected")
		return
	}

	// ดึงเฉพาะสินค้าที่ Is_active = true
	rows, err := h.MallDB.QueryContext(r.Context(), `
		SELECT id, sku, name, COALESCE(description, ''), price, stock, COALESCE(image_url, '') 
		FROM products 
		WHERE is_active = true 
		ORDER BY id DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}
	defer rows.Close()

	var products []map[string]any
	for rows.Next() {
		var id, stock int
		var sku, name, desc, img string
		var price float64
		
		if err := rows.Scan(&id, &sku, &name, &desc, &price, &stock, &img); err == nil {
			products = append(products, map[string]any{
				"id":          id,
				"sku":         sku,
				"name":        name,
				"description": desc,
				"price":       price,
				"stock":       stock,
				"image_url":   img,
			})
		}
	}
	
	if products == nil {
		products = []map[string]any{}
	}
	
	WriteJSON(w, http.StatusOK, products)
}

// GetProductByID ดึงข้อมูลสินค้ารายตัว (เพื่อทำหน้ารายละเอียดในอนาคต)
func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	var stock int
	var sku, name, desc, img string
	var price float64
	
	err := h.MallDB.QueryRowContext(r.Context(), `
		SELECT sku, name, COALESCE(description, ''), price, stock, COALESCE(image_url, '') 
		FROM products WHERE id = $1 AND is_active = true
	`, id).Scan(&sku, &name, &desc, &price, &stock, &img)
	
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Product not found")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"id":          id,
		"sku":         sku,
		"name":        name,
		"description": desc,
		"price":       price,
		"stock":       stock,
		"image_url":   img,
	})
}