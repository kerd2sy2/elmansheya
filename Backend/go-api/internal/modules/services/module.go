package services

import (
	"net/http"

	"elmansheya/go-api/internal/platform/middleware"
)

type Module struct {
	handler *Handler
}

func NewModule() *Module {
	repo := NewRepository()
	svc := NewService(repo)
	return &Module{handler: NewHandler(svc)}
}

func (m *Module) Name() string    { return "services" }
func (m *Module) TitleAr() string { return "دليل الخدمات" }
func (m *Module) Prefix() string  { return "/api/v1/services" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/categories", m.handler.GetCategories)
	mux.HandleFunc("/items", m.handler.GetItems)

	// حماية مسار إضافة وتحديث الخدمات: مقتصر على المشرف العام والمشرف والمساعدين المصرح لهم
	authorizedServiceEditors := []string{
		"super_admin",
		"admin",
		"public_utilities_assistant",
		"health_humanitarian_assistant",
		"commerce_mobility_assistant",
		"media_events_assistant",
	}
	mux.HandleFunc("/create-item", middleware.RequireRoles("services", authorizedServiceEditors, m.handler.CreateItem))
	mux.HandleFunc("/", m.handler.GetCategories)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
