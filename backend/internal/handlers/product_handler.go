package handlers

import (
	"encoding/json"
	"net/http"
	"shopping-mall/internal/models"
)

// GetProducts เป็น Mock Handler สำหรับดึงข้อมูลสินค้าเบื้องต้น
func GetProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Mock Data เพื่อให้สามารถคอมไพล์และรันได้ทันทีโดยไม่ต้องต่อ DB จริงในขั้นตอนนี้
	products := []models.Product{
		{ID: 1, Name: "Mechanical Keyboard", Price: 3500.00, Stock: 50, IsActive: true},
		{ID: 2, Name: "Wireless Mouse", Price: 1200.00, Stock: 100, IsActive: true},
	}

	if err := json.NewEncoder(w).Encode(products); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}