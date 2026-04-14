package handlers

import "time"

// ===== Models (แชร์กันใช้ใน Package handlers) =====
type News struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// ===== Models สำหรับ Wallet =====
type UserWallet struct {
	UserID  string  `json:"user_id"`
	Balance float64 `json:"balance"`
}

type TopupWalletRequest struct {
	Amount float64 `json:"amount"`
}

type Carousel struct {
	ID        int       `json:"id"`
	ImageURL  string    `json:"image_url"`
	LinkURL   string    `json:"link_url"`
	IsActive  bool      `json:"is_active"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type Document struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CoverImage  string    `json:"cover_image"`
	GalleryURLs string    `json:"gallery_urls"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// ===== Models สำหรับ Product Comments =====
type ProductComment struct {
	ID        int       `json:"id"`
	ProductID int       `json:"product_id"`
	UserID    string    `json:"user_id"`
	OrderID   int       `json:"order_id"`
	Rating    int       `json:"rating"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateCommentRequest struct {
	OrderID int    `json:"order_id"` // ระบุ order ที่ต้องการคอมเมนต์
	Rating  int    `json:"rating"`
	Message string `json:"message"`
}