package handlers

import (
	"encoding/json"
	"net/http"
	"backend/internal/models"
	"backend/internal/services"
)

func Checkout(w http.ResponseWriter, r *http.Request) {
	var req models.CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// ส่งเข้าคิวประมวลผล
	resultChan := make(chan bool)
	services.JobQueue <- services.CheckoutJob{
		OrderReq: req,
		Result:   resultChan,
	}

	// รอผลลัพธ์จากคิว
	success := <-resultChan
	w.Header().Set("Content-Type", "application/json")
	if success {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Order processed successfully", "status": "processing"})
	} else {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Checkout failed: Insufficient stock or payment error"})
	}
}