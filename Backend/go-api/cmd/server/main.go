package main

import (
	"log"
	"net/http"
	"time"

	"elmansheya/go-api/internal/modules/audit_logs"
	"elmansheya/go-api/internal/modules/auth"
	"elmansheya/go-api/internal/modules/craftsmen"
	"elmansheya/go-api/internal/modules/events"
	"elmansheya/go-api/internal/modules/healthcare"
	"elmansheya/go-api/internal/modules/humanitarian"
	"elmansheya/go-api/internal/modules/news"
	"elmansheya/go-api/internal/modules/notifications"
	"elmansheya/go-api/internal/modules/permissions"
	"elmansheya/go-api/internal/modules/ratings"
	"elmansheya/go-api/internal/modules/reports"
	"elmansheya/go-api/internal/modules/services"
	"elmansheya/go-api/internal/modules/storage"
	"elmansheya/go-api/internal/modules/users"
	"elmansheya/go-api/internal/modules/verification"
	"elmansheya/go-api/internal/platform/cache"
	"elmansheya/go-api/internal/platform/config"
	"elmansheya/go-api/internal/platform/registry"
)

func main() {
	cfg := config.Load()
	highScaleCache := cache.NewHighScaleCache()
	modRegistry := registry.NewModuleRegistry()

	// تسجيل الموديولات الـ 14 المستقلة بحيث يعمل كل موديول داخل جدار عزل خاص به
	modRegistry.Register(auth.NewModule())
	modRegistry.Register(users.NewModule())
	modRegistry.Register(verification.NewModule())
	modRegistry.Register(news.NewModule(highScaleCache, cfg.NewsCacheTTL))
	craftsmenMod := craftsmen.NewModule()
	modRegistry.Register(craftsmenMod)
	modRegistry.Register(ratings.NewModule(craftsmenMod.Repo()))
	modRegistry.Register(services.NewModule())
	modRegistry.Register(events.NewModule())
	modRegistry.Register(humanitarian.NewModule())
	modRegistry.Register(healthcare.NewModule())
	modRegistry.Register(reports.NewModule())
	modRegistry.Register(notifications.NewModule())
	modRegistry.Register(permissions.NewModule())
	modRegistry.Register(audit_logs.NewModule())
	modRegistry.Register(storage.NewModule())

	rootMux := http.NewServeMux()
	modRegistry.MountAll(rootMux)
	rootMux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("data"))))

	srv := &http.Server{
		Addr:         ":" + cfg.HTTPPort,
		Handler:      enableCORS(rootMux),
		ReadTimeout:  180 * time.Second,
		WriteTimeout: 180 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("[%s] Modular Monolith running on port %s (14 isolated modules mounted)", cfg.AppName, cfg.HTTPPort)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server stopped: %v", err)
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[HTTP %s] %s (Remote: %s)", r.Method, r.URL.Path, r.RemoteAddr)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, If-None-Match")
		w.Header().Set("Access-Control-Expose-Headers", "ETag")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
