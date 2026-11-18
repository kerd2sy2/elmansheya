package humanitarian

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "humanitarian" }
func (m *Module) TitleAr() string { return "الحالات الإنسانية والتبرعات" }
func (m *Module) Prefix() string  { return "/api/v1/humanitarian" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", m.handler.GetCases)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
