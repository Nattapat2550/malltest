package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mediaBytes, _ := json.Marshal(p.Media)

	_, err := h.MallDB.Exec(`
		INSERT INTO products (sku, name, description, price, stock, category_id, shop_id, image_url, media_urls) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ShopID, p.ImageURL, string(mediaBytes))

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product created successfully"})
}

func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mediaBytes, _ := json.Marshal(p.Media)

	_, err := h.MallDB.Exec(`
		UPDATE products 
		SET sku=$1, name=$2, description=$3, price=$4, stock=$5, category_id=$6, shop_id=$7, image_url=$8, media_urls=$9, updated_at=CURRENT_TIMESTAMP
		WHERE id=$10`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ShopID, p.ImageURL, string(mediaBytes), id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product updated successfully"})
}

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.MallDB.Exec("DELETE FROM products WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product deleted successfully"})
}