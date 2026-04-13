package handlers

import (
	"encoding/json"
	"net/http"
)

func GoogleOAuthLogin(w http.ResponseWriter, r *http.Request) {
	// รองรับ Flow เดิมของระบบที่ใช้ Google OAuth
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": "https://accounts.google.com/o/oauth2/v2/auth?..."})
}