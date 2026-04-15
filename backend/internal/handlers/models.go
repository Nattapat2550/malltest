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

// ===== Models สำหรับ Wallet & Users =====
type UserWallet struct {
	UserID  string  `json:"user_id"`
	Balance float64 `json:"balance"`
}

type TopupWalletRequest struct {
	Amount float64 `json:"amount"`
}

type UserAddress struct {
	ID        int       `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Address   string    `json:"address"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}

type UserRoleInfo struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
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
	OrderID int    `json:"order_id"`
	Rating  int    `json:"rating"`
	Message string `json:"message"`
}

// ===== Models สำหรับระบบ Shipments & Tracking =====
type ShipmentUpdateRequest struct {
	ShipmentID     int    `json:"shipment_id"`
	Status         string `json:"status"` // cancelled, shipped_to_center, at_center, delivering, completed
	CenterID       *int   `json:"center_id,omitempty"` // สำหรับ Owner เลือกส่ง Center หรือ Center จ่ายต่อไป Center อื่น
	RiderID        *int   `json:"rider_id,omitempty"`  // สำหรับ Center จ่ายงานให้ Rider
	TrackingDetail string `json:"tracking_detail"`     // ข้อความแสดงในหน้าติดตามลูกค้า
	Location       string `json:"location"`
}