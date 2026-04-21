package httpapi

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"backend/internal/config"
	"backend/internal/handlers"
	"backend/internal/pureapi"
)

// securityHeaders middleware ช่วยเพิ่ม HTTP Security Headers เพื่อปิดช่องโหว่ตาม ZAP Report
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ป้องกัน Clickjacking (Missing Anti-clickjacking Header)
		w.Header().Set("X-Frame-Options", "DENY")
		
		// ป้องกัน XSS และ Data Injection (Content Security Policy Header Not Set)
		w.Header().Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';")
		
		// บังคับใช้ HTTPS เสมอ (Strict-Transport-Security Header Not Set)
		w.Header().Set("Strict-Transport-Security", "max-age=315360000; includeSubDomains; preload")
		
		// ป้องกัน MIME-type sniffing (แถมให้เป็น Best Practice)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		
		next.ServeHTTP(w, r)
	})
}

func NewRouter(cfg config.Config, mallDB *sql.DB) http.Handler {
	r := chi.NewRouter()

	// 1. Base Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// เพิ่ม Security Headers Middleware ที่นี่เพื่อให้มีผลกับทุก Routes
	r.Use(securityHeaders)

	// 2. CORS
	allowedOrigins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	if cfg.FrontendURL != "" {
		allowedOrigins = append(allowedOrigins, strings.TrimRight(cfg.FrontendURL, "/"))
	}
	r.Use(cors(allowedOrigins, true))

	// 3. Initialize Handlers
	p := pureapi.NewClient(cfg.PureAPIBaseURL, cfg.PureAPIKey, cfg.PureAPIInternalURL)
	h := handlers.New(cfg, p, mallDB)

	// 4. Base & Health Routes
	r.Get("/api/health", h.Health)
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		if cfg.FrontendURL != "" {
			http.Redirect(w, req, cfg.FrontendURL, http.StatusFound)
			return
		}
		w.Write([]byte("Shopping Mall API is running"))
	})
	r.Get("/favicon.ico", func(w http.ResponseWriter, req *http.Request) { 
		w.WriteHeader(http.StatusNoContent) 
	})

	// 5. Grouped Routes (Imported from routes_*.go files)
	r.Route("/api/auth", setupAuthRoutes(h))
	r.Route("/api/users", setupUserRoutes(h))
	r.Route("/api/admin", setupAdminRoutes(h))
	r.Route("/api/products", setupProductRoutes(h))
	r.Route("/api/orders", setupOrderRoutes(h))
	r.Route("/api/center", setupCenterRoutes(h))
	r.Route("/api/owner", setupOwnerRoutes(h)) 
	r.Route("/api/rider", setupRiderRoutes(h))

	// 6. Public & Miscellaneous Routes
	r.Get("/api/shops/{id}", h.GetShopByID)
	r.Get("/api/shops/{id}/products", h.GetShopProductsPublic)

	r.Get("/api/homepage", h.HomepageGet)
	r.With(h.RequireAdmin).Put("/api/homepage", h.HomepageUpdate)
	
	r.Get("/api/news", h.GetLatestNews)
	r.Get("/api/carousel", h.CarouselList)
	r.Get("/api/documents/list", h.DocumentList)
	r.Get("/api/documents/{id}", h.GetDocumentDetail)
	
	r.Get("/api/download/windows", h.DownloadWindows)
	r.Get("/api/download/android", h.DownloadAndroid)
	r.Post("/api/appeals", h.SubmitAppeal)

	return r
}