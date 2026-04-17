package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) OwnerGetShop(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	
	// ใช้ Random UserID
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
		_, err = h.MallDB.Exec("INSERT INTO shops (owner_id, name) VALUES ($1, $2)", uidStr, req.Name)
	case nil:
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
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

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
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusForbidden)
		return
	}

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

func (h *Handler) OwnerGetOrders(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	
	uidStr := u.UserID
	if uidStr == "" {
		uidStr = fmt.Sprintf("%v", u.ID)
	}

	var shopID int
	err := h.MallDB.QueryRow("SELECT id FROM shops WHERE owner_id = $1", uidStr).Scan(&shopID)
	if err != nil {
		http.Error(w, "Shop not found", http.StatusForbidden)
		return
	}

	rows, err := h.MallDB.Query(`
		SELECT 
			s.id as shipment_id, s.status as shipment_status, 
			o.id as order_id, o.user_id, o.address, o.created_at
		FROM shipments s
		JOIN orders o ON s.order_id = o.id
		WHERE s.shop_id = $1
		ORDER BY s.id DESC
	`, shopID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var shipmentID, orderID int
		var shipmentStatus, userID, address string
		var createdAt any

		if err := rows.Scan(&shipmentID, &shipmentStatus, &orderID, &userID, &address, &createdAt); err == nil {
			
			itemRows, errItem := h.MallDB.Query(`
				SELECT oi.quantity, p.name, p.price, p.image_url
				FROM order_items oi
				JOIN products p ON oi.product_id = p.id
				WHERE oi.order_id = $1 AND p.shop_id = $2
			`, orderID, shopID)

			var items []map[string]any
			if errItem == nil {
				for itemRows.Next() {
					var qty int
					var name string
					var price float64
					var img sql.NullString
					itemRows.Scan(&qty, &name, &price, &img)
					items = append(items, map[string]any{
						"name": name,
						"quantity": qty,
						"price": price,
						"image_url": img.String,
					})
				}
				itemRows.Close()
			}

			results = append(results, map[string]any{
				"shipment_id": shipmentID,
				"shipment_status": shipmentStatus,
				"order_id": orderID,
				"user_id": userID,
				"address": address,
				"created_at": createdAt,
				"items": items,
			})
		}
	}
	
	if results == nil { results = []map[string]any{} }
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}