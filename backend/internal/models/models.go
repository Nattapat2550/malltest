package models

import "time"

type User struct {
	ID        int       `json:"id"`
	GoogleID  string    `json:"google_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Stock       int       `json:"stock"`
	ImageURL    string    `json:"image_url"`
	IsActive    bool      `json:"is_active"`
}

type Order struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	TotalAmount float64   `json:"total_amount"`
	Status      string    `json:"status"` // pending, processing, shipped, failed
	CreatedAt   time.Time `json:"created_at"`
}

type CheckoutRequest struct {
	UserID int `json:"user_id"`
	Items  []struct {
		ProductID int `json:"product_id"`
		Quantity  int `json:"quantity"`
	} `json:"items"`
}