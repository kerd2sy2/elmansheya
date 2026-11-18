package audit_logs

import "net/http"

type Module struct{ handler *Handler }

func NewModule() *Module {
	return &Module{handler: NewHandler(NewService(NewRepository()))}
}

func (m *Module) Name() string    { return "audit_logs" }
func (m *Module) TitleAr() string { return "سجل العمليات والنشاط" }
func (m *Module) Prefix() string  { return "/api/v1/audit-logs" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", m.handler.GetLogs)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
