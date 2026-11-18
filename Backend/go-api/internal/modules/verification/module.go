package verification

import "net/http"

type Module struct {
	handler *Handler
}

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "verification" }
func (m *Module) TitleAr() string { return "توثيق حساب المواطن" }
func (m *Module) Prefix() string  { return "/api/v1/verification" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/status", m.handler.GetStatus)
	mux.HandleFunc("/submit", m.handler.Submit)
	mux.HandleFunc("/review", m.handler.Review)
	mux.HandleFunc("/", m.handler.GetStatus)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
