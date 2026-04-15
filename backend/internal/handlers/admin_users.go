package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) AdminGetUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var users []map[string]any

	if err := h.Pure.Get(ctx, "/api/internal/admin/users", &users); err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถดึงข้อมูล User จากระบบส่วนกลางได้")
		return
	}

	wRows, err := h.MallDB.Query("SELECT user_id, balance FROM user_wallets")
	wallets := make(map[string]float64)
	if err == nil {
		defer wRows.Close()
		for wRows.Next() {
			var uid string
			var balance float64
			if err := wRows.Scan(&uid, &balance); err == nil {
				wallets[uid] = balance
			}
		}
	}

	rRows, err := h.MallDB.Query("SELECT user_id, role FROM user_roles")
	roles := make(map[string]string)
	if err == nil {
		defer rRows.Close()
		for rRows.Next() {
			var uid string
			var role string
			if err := rRows.Scan(&uid, &role); err == nil {
				roles[uid] = role
			}
		}
	}

	for i, user := range users {
		var uid string
		if idVal, ok := user["id"]; ok && idVal != nil {
			uid = fmt.Sprintf("%v", idVal)
		}

		if uid != "" {
			if bal, exists := wallets[uid]; exists {
				users[i]["balance"] = bal
			} else {
				users[i]["balance"] = 0.00 
			}

			if dbRole, exists := roles[uid]; exists && dbRole != "" {
				users[i]["role"] = dbRole
			} else {
				pureRole, _ := user["role"].(string)
				if pureRole == "admin" {
					users[i]["role"] = "admin" 
				} else {
					users[i]["role"] = "customer" 
				}
			}
		} else {
			users[i]["balance"] = 0.00
			users[i]["role"] = "customer"
		}
	}

	WriteJSON(w, http.StatusOK, users)
}

func (h *Handler) AdminUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	var req struct {
		Role string `json:"role"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), `
		INSERT INTO user_roles (user_id, role) 
		VALUES ($1, $2)
		ON CONFLICT (user_id) 
		DO UPDATE SET role = EXCLUDED.role
	`, idStr, req.Role)

	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถอัปเดตสิทธิ์การใช้งานในระบบได้: "+err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Role updated successfully",
		"role":    req.Role,
	})
}

func (h *Handler) UpdateUserWallet(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id") 
	
	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err := h.MallDB.Exec(`
		INSERT INTO user_wallets (user_id, balance) 
		VALUES ($1, $2)
		ON CONFLICT (user_id) 
		DO UPDATE SET balance = EXCLUDED.balance, updated_at = CURRENT_TIMESTAMP
	`, userID, req.Balance)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Wallet updated successfully",
		"new_balance": req.Balance,
	})
}