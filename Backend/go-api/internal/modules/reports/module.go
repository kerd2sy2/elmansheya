package reports

import "net/http"

type Module struct {
	handler *Handler
}

func NewModule() *Module {
	repo := NewRepository()
	svc := NewService(repo)
	return &Module{handler: NewHandler(svc)}
}

func (m *Module) Name() string    { return "reports" }
func (m *Module) TitleAr() string { return "منظومة البلاغات" }
func (m *Module) Prefix() string  { return "/api/v1/reports" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/public", m.handler.GetPublicOverview)
	mux.HandleFunc("/create", m.handler.Create)
	mux.HandleFunc("/my-reports", m.handler.GetMyReports)
	mux.HandleFunc("/", m.handler.GetPublicOverview)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
