package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"backend/internal/pureapi"

	"github.com/DATA-DOG/go-sqlmock"
)

// --- HELPER FUNCTIONS ---

func newMockPureAPI(handler http.HandlerFunc) (*httptest.Server, *pureapi.Client) {
	ts := httptest.NewServer(handler)
	client := pureapi.NewClient(ts.URL, "dummy-key")
	return ts, client
}

func setupAuthRequest(method, url string, body io.Reader, user *AuthUser) *http.Request {
	req, _ := http.NewRequest(method, url, body)
	if user != nil {
		ctx := context.WithValue(req.Context(), ctxUser, user)
		req = req.WithContext(ctx)
	}
	return req
}

// --- UNIT TESTS ---

func TestUsersMeGet(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	tests := []struct {
		name           string
		user           *AuthUser
		mockAPIHandler http.HandlerFunc
		setupMockDB    func()
		expectedStatus int
	}{
		{
			name: "Success - Get Active User",
			user: &AuthUser{ID: 1, UserID: "U123"},
			mockAPIHandler: func(w http.ResponseWriter, r *http.Request) {
				res := map[string]any{"id": 1, "status": "active"}
				json.NewEncoder(w).Encode(res)
			},
			setupMockDB: func() {
				mock.ExpectQuery("SELECT role FROM user_roles").
					WithArgs("U123").
					WillReturnRows(sqlmock.NewRows([]string{"role"}).AddRow("admin"))
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "DB Error fetching roles",
			user: &AuthUser{ID: 1, UserID: "U123"},
			mockAPIHandler: func(w http.ResponseWriter, r *http.Request) {
				res := map[string]any{"id": 1, "status": "active"}
				json.NewEncoder(w).Encode(res)
			},
			setupMockDB: func() {
				mock.ExpectQuery("SELECT role FROM user_roles").
					WithArgs("U123").
					WillReturnError(sql.ErrConnDone)
			},
			// เมื่อ DB ดึง Role พลาด ระบบจะให้เป็น "customer" และคืน Status 200 เหมือนเดิม
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Unauthorized - No User",
			user:           nil,
			mockAPIHandler: nil,
			setupMockDB:    func() {},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMockDB()

			var pureClient *pureapi.Client
			if tt.mockAPIHandler != nil {
				ts, client := newMockPureAPI(tt.mockAPIHandler)
				defer ts.Close()
				pureClient = client
			} else {
				pureClient = pureapi.NewClient("http://dummy", "dummy")
			}

			h := &Handler{
				MallDB: db,
				Pure:   pureClient,
			}

			req := setupAuthRequest("GET", "/api/users/me", nil, tt.user)
			rr := httptest.NewRecorder()

			h.UsersMeGet(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestUsersMePut(t *testing.T) {
	tests := []struct {
		name           string
		user           *AuthUser
		payload        map[string]any
		mockAPIHandler http.HandlerFunc
		expectedStatus int
	}{
		{
			name: "Success Update Profile",
			user: &AuthUser{ID: 1},
			payload: map[string]any{"first_name": "Updated"},
			mockAPIHandler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]any{"id": 1, "first_name": "Updated"})
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Bad Request - Invalid JSON",
			user:           &AuthUser{ID: 1},
			payload:        nil,
			mockAPIHandler: nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Pure API Failure",
			user: &AuthUser{ID: 1},
			payload: map[string]any{"first_name": "Updated"},
			mockAPIHandler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var pureClient *pureapi.Client
			if tt.mockAPIHandler != nil {
				ts, client := newMockPureAPI(tt.mockAPIHandler)
				defer ts.Close()
				pureClient = client
			} else {
				pureClient = pureapi.NewClient("http://dummy", "dummy")
			}

			h := &Handler{Pure: pureClient}

			var body []byte
			if tt.payload != nil {
				body, _ = json.Marshal(tt.payload)
			} else {
				body = []byte(`{invalid json`)
			}

			req := setupAuthRequest("PUT", "/api/users/me", bytes.NewBuffer(body), tt.user)
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			h.UsersMePut(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestUsersMeAvatar(t *testing.T) {
	t.Run("Success Upload Avatar", func(t *testing.T) {
		ts, client := newMockPureAPI(func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"ok":                  true,
				"profile_picture_url": "data:image/png;base64,ZHVtbXk=",
			})
		})
		defer ts.Close()

		h := &Handler{Pure: client}

		body := new(bytes.Buffer)
		writer := multipart.NewWriter(body)
		
		// เพิ่ม Header บังคับให้เป็นไฟล์รูปภาพเพื่อให้ผ่านการตรวจสอบ allowedImageMime()
		mh := make(textproto.MIMEHeader)
		mh.Set("Content-Disposition", `form-data; name="avatar"; filename="test.png"`)
		mh.Set("Content-Type", "image/png")
		part, _ := writer.CreatePart(mh)
		
		part.Write([]byte("dummy image data"))
		writer.Close()

		req := setupAuthRequest("POST", "/api/users/me/avatar", body, &AuthUser{ID: 1})
		req.Header.Set("Content-Type", writer.FormDataContentType())

		rr := httptest.NewRecorder()
		h.UsersMeAvatar(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("Invalid File Type", func(t *testing.T) {
		client := pureapi.NewClient("http://dummy", "dummy")
		h := &Handler{Pure: client}

		body := new(bytes.Buffer)
		writer := multipart.NewWriter(body)
		
		// ไฟล์นี้จะหลุดเรื่อง Content-Type ไปทำให้กลายเป็น 400
		mh := make(textproto.MIMEHeader)
		mh.Set("Content-Disposition", `form-data; name="avatar"; filename="test.txt"`)
		mh.Set("Content-Type", "text/plain")
		part, _ := writer.CreatePart(mh)
		part.Write([]byte("this is a text file"))
		writer.Close()

		req := setupAuthRequest("POST", "/api/users/me/avatar", body, &AuthUser{ID: 1})
		req.Header.Set("Content-Type", writer.FormDataContentType())

		rr := httptest.NewRecorder()
		h.UsersMeAvatar(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status %d for invalid file, got %d", http.StatusBadRequest, rr.Code)
		}
	})
}

func TestUsersMeDelete(t *testing.T) {
	t.Run("Success Delete Account", func(t *testing.T) {
		ts, client := newMockPureAPI(func(w http.ResponseWriter, r *http.Request) {
			var p map[string]any
			json.NewDecoder(r.Body).Decode(&p)
			if p["status"] != "deleted" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			json.NewEncoder(w).Encode(map[string]any{"ok": true})
		})
		defer ts.Close()

		h := &Handler{Pure: client}

		req := setupAuthRequest("DELETE", "/api/users/me", nil, &AuthUser{ID: 1})
		rr := httptest.NewRecorder()

		h.UsersMeDelete(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
	})
}

func TestGetUserWallet(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	h := &Handler{MallDB: db}

	t.Run("Success Get Balance", func(t *testing.T) {
		mock.ExpectQuery("SELECT balance FROM user_wallets WHERE user_id = \\$1").
			WithArgs("U123").
			WillReturnRows(sqlmock.NewRows([]string{"balance"}).AddRow(1500.50))

		req := setupAuthRequest("GET", "/api/users/wallet", nil, &AuthUser{ID: 1, UserID: "U123"})
		rr := httptest.NewRecorder()

		h.GetUserWallet(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if !strings.Contains(rr.Body.String(), "1500.5") {
			t.Errorf("expected body to contain balance 1500.50")
		}
	})

	t.Run("No Wallet Found Returns Zero", func(t *testing.T) {
		mock.ExpectQuery("SELECT balance FROM user_wallets WHERE user_id = \\$1").
			WithArgs("U123").
			WillReturnError(sql.ErrNoRows)

		req := setupAuthRequest("GET", "/api/users/wallet", nil, &AuthUser{ID: 1, UserID: "U123"})
		rr := httptest.NewRecorder()

		h.GetUserWallet(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if !strings.Contains(rr.Body.String(), "0") {
			t.Errorf("expected body to contain balance 0")
		}
	})
}

func TestGetUserAddresses(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to open mock db: %v", err)
	}
	defer db.Close()

	h := &Handler{MallDB: db}

	t.Run("Success Get Addresses", func(t *testing.T) {
		now := time.Now()
		// ใช้ Object time.Now() แทน String เพื่อให้ Scan เข้า struct ได้ถูกต้อง
		rows := sqlmock.NewRows([]string{"id", "title", "address", "is_default", "created_at"}).
			AddRow(1, "Home", "123 BKK", true, now).
			AddRow(2, "Office", "456 BKK", false, now)

		mock.ExpectQuery("SELECT id, title, address, is_default, created_at FROM user_addresses").
			WithArgs("U123").
			WillReturnRows(rows)

		req := setupAuthRequest("GET", "/api/users/addresses", nil, &AuthUser{ID: 1, UserID: "U123"})
		rr := httptest.NewRecorder()

		h.GetUserAddresses(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if !strings.Contains(rr.Body.String(), "Office") {
			t.Errorf("expected response to contain address title 'Office'")
		}
	})
}

func TestAddUserAddress(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to open mock db: %v", err)
	}
	defer db.Close()

	h := &Handler{MallDB: db}

	t.Run("Success Add Address", func(t *testing.T) {
		payload := map[string]string{
			"title":   "Condo",
			"address": "789 BKK",
		}
		body, _ := json.Marshal(payload)

		mock.ExpectExec("INSERT INTO user_addresses").
			WithArgs("U123", "Condo", "789 BKK").
			WillReturnResult(sqlmock.NewResult(1, 1))

		req := setupAuthRequest("POST", "/api/users/addresses", bytes.NewBuffer(body), &AuthUser{ID: 1, UserID: "U123"})
		rr := httptest.NewRecorder()

		h.AddUserAddress(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201 Created, got %d", rr.Code)
		}
	})
}