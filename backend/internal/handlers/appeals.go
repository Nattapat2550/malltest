package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type SubmitAppealRequest struct {
	Email   string `json:"email"`
	Reason  string `json:"reason"`
	Topic   string `json:"topic"`
	Message string `json:"message"`
}

func (h *Handler) SubmitAppeal(w http.ResponseWriter, r *http.Request) {
	var req SubmitAppealRequest
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "ข้อมูลไม่ถูกต้อง")
		return
	}

	var topic, message string
	if req.Topic != "" && req.Message != "" {
		topic = req.Topic
		message = req.Message
	} else if req.Email != "" && req.Reason != "" {
		topic = "Ban Appeal"
		message = "Email: " + req.Email + "\nReason: " + req.Reason
	} else {
		h.writeError(w, http.StatusBadRequest, "กรุณากรอกข้อมูลให้ครบถ้วน")
		return
	}

	userID := "guest"
	u := GetUser(r)
	if u == nil {
		token := extractTokenFromReq(r)
		if token != "" {
			if claims, err := h.parseToken(token); err == nil {
				userID = GetUserIDStr(&AuthUser{ID: claims.ID, UserID: claims.UserID})
			}
		}
	} else {
		userID = GetUserIDStr(u)
	}

	_, err := h.MallDB.ExecContext(r.Context(), "INSERT INTO appeals (user_id, topic, message, status) VALUES ($1, $2, $3, $4)", userID, topic, message, "pending")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถยื่นคำร้องได้ในขณะนี้")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "ยื่นคำร้องสำเร็จแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด"})
}

type AppealDTO struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}