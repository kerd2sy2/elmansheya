package news

import (
	"net/http"
	"time"

	"elmansheya/go-api/internal/platform/cache"
	"elmansheya/go-api/internal/platform/middleware"
)

type Module struct {
	handler   *Handler
	highCache *cache.HighScaleCache
}

func NewModule(highCache *cache.HighScaleCache, cacheTTL time.Duration) *Module {
	repo := NewRepository()
	svc := NewService(repo, highCache, cacheTTL)
	handler := NewHandler(svc)
	return &Module{
		handler:   handler,
		highCache: highCache,
	}
}

func (m *Module) Name() string    { return "news" }
func (m *Module) TitleAr() string { return "الأخبار والشاشة الرئيسية" }
func (m *Module) Prefix() string  { return "/api/v1/news" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	etagGuard := middleware.ETagMiddleware(m.highCache, 15)

	authorizedPublishers := []string{"super_admin", "admin", "news_assistant", "media_events_assistant"}

	mux.Handle("/feed", etagGuard(http.HandlerFunc(m.handler.GetFeed)))
	mux.HandleFunc("/publish", middleware.RequireRoles("news", authorizedPublishers, m.handler.Publish))
	mux.HandleFunc("/delete", middleware.RequireRoles("news", authorizedPublishers, m.handler.Delete))
	mux.HandleFunc("/detail", m.handler.GetDetail)
	mux.Handle("/", etagGuard(http.HandlerFunc(m.handler.GetFeed)))
	return mux
}

func (m *Module) HealthCheck() error {
	return nil
}
