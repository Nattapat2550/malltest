package handlers

import (
	"encoding/json"
	"net/http"
)

type Product struct {
	ID          int     `json:"id"`
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	ImageURL    string  `json:"image_url"`
}

// ผูกเข้ากับ (h *Handler) และเปลี่ยนชื่อให้ตรงกับ router.go
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	products := []Product{
		{ID: 1, SKU: "P001", Name: "Mechanical Keyboard", Description: "คีย์บอร์ดเรืองแสงสวิตช์ Blue กดสนุก พิมพ์เพลิน เหมาะสำหรับเล่นเกม", Price: 2500, Stock: 15, ImageURL: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800"},
		{ID: 2, SKU: "P002", Name: "Gaming Mouse", Description: "เมาส์ไร้สายความเร็วสูง DPI 16000 น้ำหนักเบา แบตเตอรี่ทนทาน", Price: 1200, Stock: 5, ImageURL: "https://images.unsplash.com/photo-1527814050087-379381547969?w=800"},
		{ID: 3, SKU: "P003", Name: "27-inch Monitor", Description: "จอภาพ IPS 4K 144Hz สีตรง ตอบสนองไว ไม่มีอาการฉีกขาดของภาพ", Price: 8500, Stock: 0, ImageURL: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	product := Product{
		ID: 1, 
		SKU: "P001", 
		Name: "Mechanical Keyboard", 
		Description: "คีย์บอร์ดเรืองแสงสวิตช์ Blue กดสนุก", 
		Price: 2500, 
		Stock: 15, 
		ImageURL: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product created successfully"})
}

func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product updated successfully"})
}

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product deleted successfully"})
}