package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Media struct {
	Type string `json:"type"` // 'image' หรือ 'video'
	URL  string `json:"url"`
}

type Product struct {
	ID          int     `json:"id"`
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	ImageURL    string  `json:"image_url"`
	Media       []Media `json:"media"` // สำหรับหน้ารอง (Carousel)
}

// ListProducts ดึงข้อมูลสินค้าทั้งหมดจากฐานข้อมูล
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, image_url, COALESCE(media_urls, '[]') 
		FROM products 
		ORDER BY id DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var mediaJSON string
		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.Stock, &p.ImageURL, &mediaJSON); err != nil {
			continue
		}
		json.Unmarshal([]byte(mediaJSON), &p.Media)
		if p.Media == nil {
			p.Media = []Media{}
		}
		products = append(products, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

// GetProductByID ดึงข้อมูลสินค้า 1 ชิ้น
func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Product
	var mediaJSON string

	err := h.MallDB.QueryRow(`
		SELECT id, sku, name, description, price, stock, image_url, COALESCE(media_urls, '[]') 
		FROM products WHERE id = $1`, id).
		Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.Stock, &p.ImageURL, &mediaJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Product not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	json.Unmarshal([]byte(mediaJSON), &p.Media)
	if p.Media == nil {
		p.Media = []Media{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mediaBytes, _ := json.Marshal(p.Media)

	_, err := h.MallDB.Exec(`
		INSERT INTO products (sku, name, description, price, stock, image_url, media_urls) 
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.ImageURL, string(mediaBytes))

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
		SET sku=$1, name=$2, description=$3, price=$4, stock=$5, image_url=$6, media_urls=$7, updated_at=CURRENT_TIMESTAMP
		WHERE id=$8`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.ImageURL, string(mediaBytes), id)

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