package permissions

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "permissions" }
func (m *Module) TitleAr() string { return "الأدوار والصلاحيات" }
func (m *Module) Prefix() string  { return "/api/v1/permissions" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/roles", m.handler.GetRoles)
	mux.HandleFunc("/", m.handler.GetRoles)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
