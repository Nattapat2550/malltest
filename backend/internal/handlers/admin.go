// backend/internal/handlers/admin.go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// --- Admin User Management (Fetch from ProjectRust) ---
func (h *Handler) AdminGetUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var users []map[string]any

	// 1. ดึงข้อมูล User จากระบบ Auth ส่วนกลาง
	if err := h.Pure.Get(ctx, "/api/internal/admin/users", &users); err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถดึงข้อมูล User จากระบบส่วนกลางได้")
		return
	}

	// 2. ดึงยอดเงินกระเป๋าจากฐานข้อมูล MallDB
	rows, err := h.MallDB.Query("SELECT user_id, balance FROM user_wallets")
	wallets := make(map[string]float64)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var uid string
			var balance float64
			if err := rows.Scan(&uid, &balance); err == nil {
				wallets[uid] = balance
			}
		}
	}

	// 3. แนบยอดเงินเข้าไปในข้อมูล User แต่ละคนก่อนส่งให้ Frontend
	for i, user := range users {
		uid, ok := user["id"].(string)
		if ok {
			if bal, exists := wallets[uid]; exists {
				users[i]["balance"] = bal
			} else {
				users[i]["balance"] = 0.00 // ค่าเริ่มต้นถ้ายังไม่เคยถูกเติมเงิน
			}
		}
	}

	WriteJSON(w, http.StatusOK, users)
}

func (h *Handler) AdminUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")

	var body map[string]any
	if err := ReadJSON(r, &body); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	payload := map[string]any{"id": idStr}
	for k, v := range body {
		payload[k] = v
	}

	var updated any
	// ส่งคำสั่งอัปเดตสิทธิ์ไปที่ ProjectRust
	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, &updated); err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถอัปเดตสิทธิ์การใช้งานได้")
		return
	}

	WriteJSON(w, http.StatusOK, updated)
}

// --- Admin Appeals Management ---
func (h *Handler) AdminGetAppeals(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, user_id, topic, message, status FROM appeals ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var appeals []map[string]any
	for rows.Next() {
		var id int
		var uid, topic, msg, status string // uid เป็น string ตามฐานข้อมูลใหม่
		if err := rows.Scan(&id, &uid, &topic, &msg, &status); err == nil {
			appeals = append(appeals, map[string]any{
				"id": id, "user_id": uid, "topic": topic, "message": msg, "status": status,
			})
		}
	}
	if appeals == nil {
		appeals = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, appeals)
}
// ไปใส่ไว้ใน backend/internal/handlers/admin.go

func (h *Handler) AdminUpdateAppealStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status string `json:"status"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input data")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), "UPDATE appeals SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update appeal status")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Appeal status updated"})
}

func (h *Handler) AdminDeleteAppeal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.MallDB.ExecContext(r.Context(), "DELETE FROM appeals WHERE id = $1", id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete appeal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
// --- Admin Product Management ---
func (h *Handler) AdminGetProducts(w http.ResponseWriter, r *http.Request) {
	// เพิ่มการดึง COALESCE(image_url, '') ออกมาจากฐานข้อมูล
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
		ImageURL string  `json:"image_url"` // รับค่ารููปภาพ
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
		ImageURL string  `json:"image_url"` // รับค่ารููปภาพ
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

// --- Admin Order Management ---
func (h *Handler) AdminGetAllOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, user_id, total_amount, status FROM orders ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var orders []map[string]any
	for rows.Next() {
		var id int
		var uid string // uid เป็น string ตามฐานข้อมูลใหม่
		var total float64
		var status string
		if err := rows.Scan(&id, &uid, &total, &status); err == nil {
			orders = append(orders, map[string]any{
				"id": id, "user_id": uid, "total_amount": total, "status": status,
			})
		}
	}
	if orders == nil {
		orders = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, orders)
}

func (h *Handler) AdminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	var req struct {
		Status string `json:"status"` // คาดหวังค่าสถานะเช่น: pending, paid, shipped, completed, cancelled
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input data")
		return
	}

	_, err := h.MallDB.ExecContext(r.Context(), 
		"UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", 
		req.Status, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update order status")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Status updated successfully"})
}

// --- Admin News Management ---
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query("SELECT id, title, content, COALESCE(image_url, '') FROM news ORDER BY id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var newsList []map[string]any
	for rows.Next() {
		var id int
		var title, content, img string
		if err := rows.Scan(&id, &title, &content, &img); err == nil {
			newsList = append(newsList, map[string]any{
				"id": id, "title": title, "content": content, "image_url": img,
			})
		}
	}
	if newsList == nil {
		newsList = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, newsList)
}

func (h *Handler) AdminCreateNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusCreated) }
func (h *Handler) AdminUpdateNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
func (h *Handler) AdminDeleteNews(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }

// --- Admin Carousel Management ---
func (h *Handler) AdminGetCarousel(w http.ResponseWriter, r *http.Request) {
	// ดึงข้อมูล Carousel จากฐานข้อมูลของ Mall
	rows, err := h.MallDB.Query("SELECT id, image_url, COALESCE(link_url, ''), is_active, sort_order FROM carousels ORDER BY sort_order ASC, id DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	
	var items []map[string]any
	for rows.Next() {
		var id, sort int
		var img, link string
		var isActive bool
		if err := rows.Scan(&id, &img, &link, &isActive, &sort); err == nil {
			items = append(items, map[string]any{
				"id": id, "image_url": img, "link_url": link, "is_active": isActive, "sort_order": sort,
			})
		}
	}
	if items == nil {
		items = []map[string]any{}
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handler) AdminUpdateCarousel(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Carousel updated"})
}

// UpdateUserWallet สำหรับให้ Admin อัปเดตยอดเงิน
func (h *Handler) UpdateUserWallet(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id") // สมมติว่าส่ง user_id มาใน URL
	
	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// ใช้ UPSERT เพื่ออัปเดตหรือสร้างกระเป๋าเงินใหม่หากยังไม่มี
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