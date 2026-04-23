package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/config"
	"backend/internal/pureapi"

	"golang.org/x/crypto/bcrypt"
)

// จำลอง Config และระบบสำหรับเทส โดยจำลองเซิร์ฟเวอร์ Pure API เข้ามาด้วยเพื่อกัน Panic
func setupTestHandler() (*Handler, *httptest.Server) {
	// จำลอง Password Hash ที่ถูกต้องเพื่อใช้ตอนทดสอบ Login
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)
	hashStr := string(hash)

	// สร้าง Mock Server จำลอง Pure API ให้ฉลาดขึ้น
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// อ่าน Body เพื่อดูว่าหา Email อะไร
		var reqBody map[string]any
		json.NewDecoder(r.Body).Decode(&reqBody)
		email, _ := reqBody["email"].(string)

		// ถ้าเป็นการทดสอบสมัครสมาชิกด้วย newuser@example.com ให้จำลองว่ายังไม่เคยมีในระบบ (404 Not Found)
		if email == "newuser@example.com" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error": "User not found"}`))
			return
		}

		// กรณีอื่นๆ (เช่น Login, Get Profile) ให้จำลองว่ามีข้อมูลแล้วและรหัสผ่านถูกต้อง
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"ok":            true,
			"id":            1,
			"email":         "test@example.com",
			"password_hash": hashStr,
			"role":          "user",
		})
	}))

	client := pureapi.NewClient(mockServer.URL, "dummy-key")

	h := &Handler{
		Pure: client,
		Cfg: config.Config{
			JWTSecret: "testsecretkey123", // ป้องกัน Token Error
			EmailDisable: true,
		},
	}
	return h, mockServer
}

func TestAuthRegister(t *testing.T) {
	h, mockServer := setupTestHandler()
	defer mockServer.Close()

	tests := []struct {
		name           string
		payload        any
		expectedStatus int
	}{
		{
			name: "Success Registration",
			// Register ใหม่ส่งแค่ email สำหรับทำ OTP Flow
			payload: map[string]any{
				"email": "newuser@example.com",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Missing Email",
			payload: map[string]any{
				"wrong_field": "something",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON",
			payload:        "invalid json string",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			if str, ok := tt.payload.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.payload)
			}

			req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			h.AuthRegister(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d. Body: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestAuthLogin(t *testing.T) {
	h, mockServer := setupTestHandler()
	defer mockServer.Close()

	tests := []struct {
		name           string
		payload        any
		expectedStatus int
	}{
		{
			name: "Success Login Structure",
			payload: map[string]any{
				"email":    "test@example.com",
				"password": "password123",
				"remember": true,
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Missing Password",
			payload: map[string]any{
				"email": "test@example.com",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON format",
			payload:        `{"email": "test@example.com", "password": }`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			if str, ok := tt.payload.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.payload)
			}

			req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			h.AuthLogin(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestAuthStatus(t *testing.T) {
	h, mockServer := setupTestHandler()
	defer mockServer.Close()

	req, _ := http.NewRequest("GET", "/api/auth/status", nil)
	rr := httptest.NewRecorder()

	h.AuthStatus(rr, req)

	if rr.Code != http.StatusUnauthorized && rr.Code != http.StatusOK {
		t.Errorf("Unexpected status for AuthStatus: %d", rr.Code)
	}
}

func TestAuthCompleteProfile(t *testing.T) {
	h, mockServer := setupTestHandler()
	defer mockServer.Close()

	tests := []struct {
		name           string
		payload        any
		expectedStatus int
	}{
		{
			name: "Complete Profile Success",
			payload: completeProfileReq{
				Email:     "googleuser@example.com",
				Username:  "newuser123",
				Password:  "securepass88",
				FirstName: "Somchai",
				LastName:  "Jaidee",
				Tel:       "0812345678",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Missing Required Fields",
			payload: map[string]any{
				"email": "incomplete@example.com",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			h.AuthCompleteProfile(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}