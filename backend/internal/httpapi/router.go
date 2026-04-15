package httpapi

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"backend/internal/config"
	"backend/internal/handlers"
	"backend/internal/pureapi"
)

func NewRouter(cfg config.Config, mallDB *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	allowedOrigins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	if cfg.FrontendURL != "" {
		allowedOrigins = append(allowedOrigins, strings.TrimRight(cfg.FrontendURL, "/"))
	}
	r.Use(cors(allowedOrigins, true))

	p := pureapi.NewClient(cfg.PureAPIBaseURL, cfg.PureAPIKey, cfg.PureAPIInternalURL)
	h := handlers.New(cfg, p, mallDB)

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

	r.Route("/api/auth", setupAuthRoutes(h))
	r.Route("/api/users", setupUserRoutes(h))
	r.Route("/api/admin", setupAdminRoutes(h))
	r.Route("/api/products", setupProductRoutes(h))
	r.Route("/api/orders", setupOrderRoutes(h))
	
	r.Route("/api/owner", setupOwnerRoutes(h)) 

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

func setupProductRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Get("/", h.ListProducts)
		r.Get("/{id}", h.GetProductByID)
		r.Get("/{id}/comments", h.GetProductComments)

		r.Group(func(r chi.Router) {
			r.Use(h.RequireAuth)
			r.Post("/{id}/comments", h.CreateProductComment)
			r.Patch("/{id}/comments/{commentID}", h.UpdateProductComment)
			r.Delete("/{id}/comments/{commentID}", h.DeleteProductComment)
		})

		r.Group(func(r chi.Router) {
			r.Use(h.RequireAuth)
			r.Use(h.RequireAdmin)
			r.Post("/", h.CreateProduct)
			r.Put("/{id}", h.UpdateProduct)
			r.Delete("/{id}", h.DeleteProduct)
		})
	}
}

func setupOrderRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Use(h.RequireAuth)
		r.Post("/checkout", h.Checkout)
		r.Get("/", h.GetMyOrders)
		r.Get("/{id}", h.GetOrderByID)
		r.Get("/{id}/tracking", h.GetOrderTracking)
		r.Put("/shipments/status", h.UpdateShipmentState) 
	}
}

func setupOwnerRoutes(h *handlers.Handler) func(chi.Router) {
	return func(r chi.Router) {
		r.Use(h.RequireAuth)
		
		r.Get("/shop", h.OwnerGetShop)
		r.Put("/shop", h.OwnerUpdateShop)
		
		r.Get("/products", h.OwnerGetProducts)
		r.Post("/products", h.OwnerCreateProduct)
		r.Put("/products/{id}", h.OwnerUpdateProduct)
		r.Delete("/products/{id}", h.OwnerDeleteProduct)

		// API สำหรับดึงออเดอร์ของ Owner
		r.Get("/orders", h.OwnerGetOrders)
	}
}