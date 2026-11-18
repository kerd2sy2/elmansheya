package healthcare

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "healthcare" }
func (m *Module) TitleAr() string { return "الصحة والطوارئ والصيدليات" }
func (m *Module) Prefix() string  { return "/api/v1/healthcare" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", m.handler.GetEntities)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
