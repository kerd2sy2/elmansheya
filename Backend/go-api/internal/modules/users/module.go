package users

import "net/http"

type Module struct {
	handler *Handler
}

func NewModule() *Module {
	repo := NewRepository()
	svc := NewService(repo)
	return &Module{handler: NewHandler(svc)}
}

func (m *Module) Name() string    { return "users" }
func (m *Module) TitleAr() string { return "حسابي والبيانات الشخصية" }
func (m *Module) Prefix() string  { return "/api/v1/users" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/me", m.handler.GetMe)
	mux.HandleFunc("/", m.handler.GetMe)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
