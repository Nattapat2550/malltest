package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
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
		http.Error(w, "คุณไม่สามารถคอมเมนต์สินค้านี้ได้", http.StatusForbidden)
		return
	}

	_, err = h.MallDB.Exec(`
		INSERT INTO product_comments (product_id, user_id, order_id, rating, message) 
		VALUES ($1, $2, $3, $4, $5)
	`, productID, userID, req.OrderID, req.Rating, req.Message)

	if err != nil {
		http.Error(w, "คุณได้คอมเมนต์ไปแล้ว หรือมีข้อผิดพลาด: "+err.Error(), http.StatusConflict)
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
		http.Error(w, "ไม่พบคอมเมนต์หรือไม่มีสิทธิ์ลบ", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// =========================================================================
// API สำหรับ Owner (จำกัดสิทธิ์จัดการเฉพาะข้อมูลและสินค้าในร้านของตัวเอง)
// =========================================================================

func (h *Handler) OwnerGetShop(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var shop struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}
	err := h.MallDB.QueryRow("SELECT id, name FROM shops WHERE owner_id = $1", uidStr).Scan(&shop.ID, &shop.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"has_shop": false})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"has_shop": true, "shop": shop})
}

func (h *Handler) OwnerUpdateShop(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	switch err {
	case sql.ErrNoRows:
		// สร้างร้านค้าใหม่ถ้ายังไม่มี
		_, err = h.MallDB.Exec("INSERT INTO shops (owner_id, name) VALUES ($1, $2)", uidStr, req.Name)
	case nil:
		// อัปเดตร้านค้าเดิม
		_, err = h.MallDB.Exec("UPDATE shops SET name = $1 WHERE id = $2", req.Name, shopID)
	}
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Shop updated successfully"})
}

func (h *Handler) OwnerGetProducts(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Product{})
		return
	}

	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls 
		FROM products WHERE shop_id = $1 ORDER BY id DESC
	`, shopID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		var desc, img, mediaJSON sql.NullString
		var catID, sID sql.NullInt64

		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &sID, &img, &mediaJSON); err != nil {
			continue
		}
		if desc.Valid { p.Description = desc.String }
		if img.Valid { p.ImageURL = img.String }
		if catID.Valid { 
			cid := int(catID.Int64)
			p.CategoryID = &cid 
		}
		if sID.Valid { 
			sid := int(sID.Int64)
			p.ShopID = &sid 
		}
		if mediaJSON.Valid && mediaJSON.String != "" {
			json.Unmarshal([]byte(mediaJSON.String), &p.Media)
		}
		if p.Media == nil { p.Media = []Media{} }
		products = append(products, p)
	}
	if products == nil { products = []Product{} }

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func (h *Handler) OwnerCreateProduct(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusForbidden)
		return
	}

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mediaBytes, _ := json.Marshal(p.Media)

	_, err = h.MallDB.Exec(`
		INSERT INTO products (sku, name, description, price, stock, category_id, shop_id, image_url, media_urls) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.CategoryID, shopID, p.ImageURL, string(mediaBytes))

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product created successfully"})
}

func (h *Handler) OwnerUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	// ตรวจสอบสิทธิ์ว่าเป็นเจ้าของร้านจริงๆ หรือไม่
	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusForbidden)
		return
	}

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mediaBytes, _ := json.Marshal(p.Media)

	// บังคับการอัปเดตเฉพาะสินค้าที่ shop_id ตรงกับของ Owner
	res, err := h.MallDB.Exec(`
		UPDATE products 
		SET sku=$1, name=$2, description=$3, price=$4, stock=$5, image_url=$6, media_urls=$7, updated_at=CURRENT_TIMESTAMP
		WHERE id=$8 AND shop_id=$9`,
		p.SKU, p.Name, p.Description, p.Price, p.Stock, p.ImageURL, string(mediaBytes), id, shopID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	affected, _ := res.RowsAffected()
	if affected == 0 {
		http.Error(w, "Product not found or you don't own it", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product updated successfully"})
}

func (h *Handler) OwnerDeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := GetUser(r)
	uidStr := fmt.Sprintf("%v", u.ID)

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusForbidden)
		return
	}

	// ลบสินค้าเฉพาะที่ shop_id ตรงกับของ Owner
	res, err := h.MallDB.Exec("DELETE FROM products WHERE id = $1 AND shop_id = $2", id, shopID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	affected, _ := res.RowsAffected()
	if affected == 0 {
		http.Error(w, "Product not found or you don't own it", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Product deleted successfully"})
}