package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminGetProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, sku, name, price, stock, COALESCE(image_url, '') FROM products ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var products []map[string]any
	for rows.Next() {
		var id, stock int
		var sku, name, img string
		var price float64
		if err := rows.Scan(&id, &sku, &name, &price, &stock, &img); err == nil {
			products = append(products, map[string]any{
				"id": id, "sku": sku, "name": name, "price": price, "stock": stock, "image_url": img,
			})
		}
	}
	if products == nil { products = []map[string]any{} }
	WriteJSON(w, http.StatusOK, products)
}

func (h *Handler) AdminCreateProduct(w http.ResponseWriter, r *http.Request) {
	var p struct {
		SKU      string  `json:"sku"`
		Name     string  `json:"name"`
		Price    float64 `json:"price"`
		Stock    int     `json:"stock"`
		ImageURL string  `json:"image_url"`
	}
	if err := ReadJSON(r, &p); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input data")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), 
		"INSERT INTO products (sku, name, price, stock, image_url) VALUES ($1, $2, $3, $4, $5)", 
		p.SKU, p.Name, p.Price, p.Stock, p.ImageURL)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create product: "+err.Error())
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Created successfully"})
}

func (h *Handler) AdminUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p struct {
		SKU      string  `json:"sku"`
		Name     string  `json:"name"`
		Price    float64 `json:"price"`
		Stock    int     `json:"stock"`
		ImageURL string  `json:"image_url"`
	}
	if err := ReadJSON(r, &p); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input data")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), 
		"UPDATE products SET sku = $1, name = $2, price = $3, stock = $4, image_url = $5 WHERE id = $6", 
		p.SKU, p.Name, p.Price, p.Stock, p.ImageURL, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update product")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated successfully"})
}

func (h *Handler) AdminDeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM products WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete product")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}