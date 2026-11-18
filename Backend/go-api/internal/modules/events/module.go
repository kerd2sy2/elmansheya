package events

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "events" }
func (m *Module) TitleAr() string { return "مناسبات القرية" }
func (m *Module) Prefix() string  { return "/api/v1/events" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", m.handler.GetEvents)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
