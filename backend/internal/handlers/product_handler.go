package handlers

import (
	"encoding/json"
	"net/http"
	"backend/internal/models"
	"backend/internal/repository"
)

func GetProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := repository.DB.Query("SELECT id, name, description, price, stock, image_url, is_active FROM products WHERE is_active = true")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.ImageURL, &p.IsActive); err != nil {
			continue
		}
		products = append(products, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}