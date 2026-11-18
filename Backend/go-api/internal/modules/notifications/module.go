package notifications

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "notifications" }
func (m *Module) TitleAr() string { return "نظام الإشعارات" }
func (m *Module) Prefix() string  { return "/api/v1/notifications" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/preferences", m.handler.GetPreferences)
	mux.HandleFunc("/", m.handler.GetPreferences)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
