package services

import (
	"log"
	"backend/internal/models"
	"backend/internal/repository"
)

// CheckoutJob เป็น struct สำหรับเก็บงานที่รอประมวลผล
type CheckoutJob struct {
	OrderReq models.CheckoutRequest
	Result   chan bool
}

var JobQueue = make(chan CheckoutJob, 1000) // บัฟเฟอร์คิวรองรับ 1000 ออเดอร์พร้อมกัน

// StartWorker ทำงานเป็น Background Service ใน main
func StartWorker() {
	go func() {
		for job := range JobQueue {
			processCheckout(job)
		}
	}()
}

func processCheckout(job CheckoutJob) {
	// เริ่ม Transaction
	tx, err := repository.DB.Begin()
	if err != nil {
		log.Printf("Tx Error: %v\n", err)
		job.Result <- false
		return
	}

	var totalAmount float64
	for _, item := range job.OrderReq.Items {
		var stock int
		var price float64
		
		// ล็อก Row เพื่อป้องกันการซื้อชนกัน (Pessimistic Locking)
		err = tx.QueryRow("SELECT stock, price FROM products WHERE id = $1 AND is_active = true FOR UPDATE", item.ProductID).Scan(&stock, &price)
		if err != nil || stock < item.Quantity {
			tx.Rollback()
			job.Result <- false
			return
		}

		// ตัดสต็อก
		_, err = tx.Exec("UPDATE products SET stock = stock - $1 WHERE id = $2", item.Quantity, item.ProductID)
		if err != nil {
			tx.Rollback()
			job.Result <- false
			return
		}
		totalAmount += price * float64(item.Quantity)
	}

	// จำลอง Payment Gateway (Mockup)
	paymentSuccess := mockPaymentGateway(totalAmount)
	if !paymentSuccess {
		tx.Rollback()
		job.Result <- false
		return
	}

	// สร้าง Order
	_, err = tx.Exec("INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, 'processing')", job.OrderReq.UserID, totalAmount)
	if err != nil {
		tx.Rollback()
		job.Result <- false
		return
	}

	tx.Commit()
	job.Result <- true
}

func mockPaymentGateway(_ float64) bool {
	// สถานการณ์จำลองการจ่ายเงินสำเร็จ 100%
	return true
}