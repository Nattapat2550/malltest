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
	ID          int       `json:"id"`
	MotherID    *int      `json:"motherid,omitempty"`    // สำหรับจัดกลุ่มสินค้าแม่-ลูก
	SKU         string    `json:"sku"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Stock       int       `json:"stock"`
	CategoryID  *int      `json:"category_id,omitempty"` // หมวดหมู่สินค้า
	ShopID      *int      `json:"shop_id,omitempty"`     // ผูกกับหน้าร้าน (Owner)
	ImageURL    string    `json:"image_url"`
	Media       []Media   `json:"media"`
	Variants    []Product `json:"variants,omitempty"`    // ตัวเลือกสินค้าในกลุ่มเดียวกัน
}

// ListProducts ดึงข้อมูลสินค้าทั้งหมดจากฐานข้อมูล
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.MallDB.Query(`
		SELECT id, motherid, sku, name, description, price, stock, category_id, shop_id, image_url, COALESCE(media_urls, '[]') 
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
		if err := rows.Scan(&p.ID, &p.MotherID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.Stock, &p.CategoryID, &p.ShopID, &p.ImageURL, &mediaJSON); err != nil {
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

// GetProductByID ดึงข้อมูลสินค้า 1 ชิ้น พร้อมกับตัวเลือก (Variants) ที่อยู่ในกลุ่มเดียวกัน
func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Product
	var mediaJSON string

	// 1. ดึงข้อมูลสินค้าที่ระบุ
	err := h.MallDB.QueryRow(`
		SELECT id, motherid, sku, name, description, price, stock, category_id, shop_id, image_url, COALESCE(media_urls, '[]') 
		FROM products WHERE id = $1`, id).
		Scan(&p.ID, &p.MotherID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.Stock, &p.CategoryID, &p.ShopID, &p.ImageURL, &mediaJSON)

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

	// 2. ดึงข้อมูลรูปแบบอื่นๆ ในกลุ่มเดียวกัน (หาตัวแม่ให้เจอก่อน)
	rootID := p.ID
	if p.MotherID != nil {
		rootID = *p.MotherID
	}

	// ดึงแม่และลูกทั้งหมดในกลุ่ม
	rows, err := h.MallDB.Query(`
		SELECT id, motherid, sku, name, description, price, stock, category_id, shop_id, image_url, COALESCE(media_urls, '[]') 
		FROM products 
		WHERE id = $1 OR motherid = $1 
		ORDER BY id ASC`, rootID)
	
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var v Product
			var vMedia string
			if err := rows.Scan(&v.ID, &v.MotherID, &v.SKU, &v.Name, &v.Description, &v.Price, &v.Stock, &v.CategoryID, &v.ShopID, &v.ImageURL, &vMedia); err == nil {
				json.Unmarshal([]byte(vMedia), &v.Media)
				if v.Media == nil {
					v.Media = []Media{}
				}
				p.Variants = append(p.Variants, v)
			}
		}
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
		INSERT INTO products (motherid, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		p.MotherID, p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ShopID, p.ImageURL, string(mediaBytes))

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
		SET motherid=$1, sku=$2, name=$3, description=$4, price=$5, stock=$6, category_id=$7, shop_id=$8, image_url=$9, media_urls=$10, updated_at=CURRENT_TIMESTAMP
		WHERE id=$11`,
		p.MotherID, p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, p.ShopID, p.ImageURL, string(mediaBytes), id)

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

// ==========================================
// ส่วนคอมเมนต์สินค้า คงไว้แบบเดิมสมบูรณ์แล้ว
// ==========================================

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

func (h *Handler) CreateProductComment(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "id")
	
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	var req CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var isValidOrder bool
	err := h.MallDB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM orders o
			JOIN order_items oi ON o.id = oi.order_id
			WHERE o.id = $1 
			  AND o.user_id = $2 
			  AND oi.product_id = $3 
			  AND o.status = 'completed'
		)
	`, req.OrderID, userID, productID).Scan(&isValidOrder)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !isValidOrder {
		http.Error(w, "คุณไม่สามารถคอมเมนต์สินค้านี้ได้ (อาจยังไม่ได้รับสินค้า หรือไม่ได้สั่งซื้อ)", http.StatusForbidden)
		return
	}

	_, err = h.MallDB.Exec(`
		INSERT INTO product_comments (product_id, user_id, order_id, rating, message) 
		VALUES ($1, $2, $3, $4, $5)
	`, productID, userID, req.OrderID, req.Rating, req.Message)

	if err != nil {
		http.Error(w, "คุณได้คอมเมนต์สินค้านี้สำหรับคำสั่งซื้อนี้ไปแล้ว หรือเกิดข้อผิดพลาด: "+err.Error(), http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment added successfully"})
}

func (h *Handler) UpdateProductComment(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentID")
	
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	var req struct {
		Rating  int    `json:"rating"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "ข้อมูลไม่ถูกต้อง", http.StatusBadRequest)
		return
	}

	result, err := h.MallDB.Exec(`
		UPDATE product_comments 
		SET rating = $1, message = $2, created_at = NOW() 
		WHERE id = $3 AND user_id = $4
	`, req.Rating, req.Message, commentID, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "ไม่พบคอมเมนต์หรือคุณไม่มีสิทธิ์แก้ไข", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "แก้ไขคอมเมนต์สำเร็จ"})
}

func (h *Handler) DeleteProductComment(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentID")
	
	u := GetUser(r)
	if u == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := u.ID

	result, err := h.MallDB.Exec("DELETE FROM product_comments WHERE id = $1 AND user_id = $2", commentID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "ไม่พบคอมเมนต์หรือคุณไม่มีสิทธิ์ลบ", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}