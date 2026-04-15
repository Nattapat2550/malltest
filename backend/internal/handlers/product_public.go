package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Media struct {
	Type string `json:"type"` 
	URL  string `json:"url"`
}

type Product struct {
	ID          int     `json:"id"`
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	CategoryID  *int    `json:"category_id,omitempty"`
	ShopID      *int    `json:"shop_id,omitempty"` 
	ImageURL    string  `json:"image_url"`
	Media       []Media `json:"media"` 
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls 
		FROM products 
		ORDER BY id DESC
	`)
	if err != nil {
		http.Error(w, "Database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var desc, img, mediaJSON sql.NullString
		var catID, shopID sql.NullInt64

		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &shopID, &img, &mediaJSON); err != nil {
			continue
		}

		if desc.Valid { p.Description = desc.String }
		if img.Valid { p.ImageURL = img.String }
		if catID.Valid { 
			cid := int(catID.Int64)
			p.CategoryID = &cid 
		}
		if shopID.Valid { 
			sid := int(shopID.Int64)
			p.ShopID = &sid 
		}

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

func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Product
	
	var desc, img, mediaJSON sql.NullString
	var catID, shopID sql.NullInt64

	err := h.MallDB.QueryRow(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls 
		FROM products WHERE id = $1`, id).
		Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &shopID, &img, &mediaJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Product not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	if desc.Valid { p.Description = desc.String }
	if img.Valid { p.ImageURL = img.String }
	if catID.Valid { 
		cid := int(catID.Int64)
		p.CategoryID = &cid 
	}
	if shopID.Valid { 
		sid := int(shopID.Int64)
		p.ShopID = &sid 
	}

	if mediaJSON.Valid && mediaJSON.String != "" {
		json.Unmarshal([]byte(mediaJSON.String), &p.Media)
	}
	if p.Media == nil {
		p.Media = []Media{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *Handler) GetProductComments(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")

	rows, err := h.MallDB.Query(`
		SELECT id, product_id, user_id, order_id, rating, message, created_at
		FROM product_comments
		WHERE product_id = $1
		ORDER BY created_at DESC
	`, productID)
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var comments []ProductComment
	for rows.Next() {
		var c ProductComment
		if err := rows.Scan(&c.ID, &c.ProductID, &c.UserID, &c.OrderID, &c.Rating, &c.Message, &c.CreatedAt); err != nil {
			continue
		}
		comments = append(comments, c)
	}

	if comments == nil {
		comments = []ProductComment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}