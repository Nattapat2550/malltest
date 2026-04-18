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
	ID           string    `json:"id"`
	SKU          string    `json:"sku"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Price        float64   `json:"price"`
	Stock        int       `json:"stock"`
	CategoryID   *string   `json:"category_id,omitempty"`
	ShopID       *string   `json:"shop_id,omitempty"` 
	ImageURL     string    `json:"image_url"`
	Media        []Media   `json:"media"` 
	ParentID     *string   `json:"parent_id,omitempty"`
	VariantType  *string   `json:"variant_type,omitempty"`
	VariantValue *string   `json:"variant_value,omitempty"`
	// เพิ่มฟิลด์ Variants เพื่อเก็บ array ของสินค้าคลาสลูก
	Variants     []Product `json:"variants,omitempty"` 
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	// ดึงสินค้าทั้งหมด (ทั้งแม่และลูก) ออกมาก่อนเพื่อจัดกลุ่มใน Code
	rows, err := h.MallDB.Query(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value 
		FROM products 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allProducts []Product
	for rows.Next() {
		var p Product
		var desc, img, mediaJSON, catID, shopID, pID, vType, vValue sql.NullString

		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &shopID, &img, &mediaJSON, &pID, &vType, &vValue); err != nil {
			continue
		}

		if desc.Valid { p.Description = desc.String }
		if img.Valid { p.ImageURL = img.String }
		if catID.Valid { 
			cid := catID.String
			p.CategoryID = &cid 
		}
		if shopID.Valid { 
			sid := shopID.String
			p.ShopID = &sid 
		}
		if pID.Valid && pID.String != "" {
			pidStr := pID.String
			p.ParentID = &pidStr
		}
		if vType.Valid && vType.String != "" {
			vTypeStr := vType.String
			p.VariantType = &vTypeStr
		}
		if vValue.Valid && vValue.String != "" {
			vValStr := vValue.String
			p.VariantValue = &vValStr
		}

		if mediaJSON.Valid && mediaJSON.String != "" {
			json.Unmarshal([]byte(mediaJSON.String), &p.Media)
		}
		if p.Media == nil {
			p.Media = []Media{}
		}
		
		allProducts = append(allProducts, p)
	}

	// 1. แยกสินค้าลูกตาม Parent ID
	childrenMap := make(map[string][]Product)
	for _, p := range allProducts {
		if p.ParentID != nil {
			childrenMap[*p.ParentID] = append(childrenMap[*p.ParentID], p)
		}
	}

	// 2. ดึงเฉพาะ Mother ID และนำสินค้าลูกยัดเข้า Array ของแม่
	var result []Product
	for _, p := range allProducts {
		if p.ParentID == nil {
			if variants, ok := childrenMap[p.ID]; ok {
				p.Variants = variants
			} else {
				p.Variants = []Product{}
			}
			result = append(result, p)
		}
	}

	if result == nil {
		result = []Product{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p Product
	
	var desc, img, mediaJSON, catID, shopID, pID, vType, vValue sql.NullString

	// ค้นหาสินค้าหลัก
	err := h.MallDB.QueryRow(`
		SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value 
		FROM products WHERE id = $1`, id).
		Scan(&p.ID, &p.SKU, &p.Name, &desc, &p.Price, &p.Stock, &catID, &shopID, &img, &mediaJSON, &pID, &vType, &vValue)

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
		cid := catID.String
		p.CategoryID = &cid 
	}
	if shopID.Valid { 
		sid := shopID.String
		p.ShopID = &sid 
	}
	if pID.Valid && pID.String != "" {
		pidStr := pID.String
		p.ParentID = &pidStr
	}
	if vType.Valid && vType.String != "" {
		vTypeStr := vType.String
		p.VariantType = &vTypeStr
	}
	if vValue.Valid && vValue.String != "" {
		vValStr := vValue.String
		p.VariantValue = &vValStr
	}

	if mediaJSON.Valid && mediaJSON.String != "" {
		json.Unmarshal([]byte(mediaJSON.String), &p.Media)
	}
	if p.Media == nil {
		p.Media = []Media{}
	}
	p.Variants = []Product{} // เริ่มต้นเป็น Array ว่างเสมอเพื่อป้องกัน Null ในหน้าเว็บ

	// หากสินค้านี้เป็น Mother ID ให้ค้นหาสินค้าลูก (Variants) พ่วงติดไปด้วย
	if p.ParentID == nil {
		rows, err := h.MallDB.Query(`
			SELECT id, sku, name, description, price, stock, category_id, shop_id, image_url, media_urls, parent_id, variant_type, variant_value 
			FROM products WHERE parent_id = $1
			ORDER BY created_at ASC
		`, p.ID)
		
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var v Product
				var vDesc, vImg, vMediaJSON, vCatID, vShopID, vPID, vvType, vvValue sql.NullString
				
				if err := rows.Scan(&v.ID, &v.SKU, &v.Name, &vDesc, &v.Price, &v.Stock, &vCatID, &vShopID, &vImg, &vMediaJSON, &vPID, &vvType, &vvValue); err == nil {
					if vDesc.Valid { v.Description = vDesc.String }
					if vImg.Valid { v.ImageURL = vImg.String }
					if vCatID.Valid { cid := vCatID.String; v.CategoryID = &cid }
					if vShopID.Valid { sid := vShopID.String; v.ShopID = &sid }
					if vPID.Valid && vPID.String != "" { pidStr := vPID.String; v.ParentID = &pidStr }
					if vvType.Valid && vvType.String != "" { vTypeStr := vvType.String; v.VariantType = &vTypeStr }
					if vvValue.Valid && vvValue.String != "" { vValStr := vvValue.String; v.VariantValue = &vValStr }
					if vMediaJSON.Valid && vMediaJSON.String != "" { json.Unmarshal([]byte(vMediaJSON.String), &v.Media) }
					if v.Media == nil { v.Media = []Media{} }
					
					p.Variants = append(p.Variants, v)
				}
			}
		}
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