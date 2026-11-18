package craftsmen

import "net/http"

type Module struct {
	handler *Handler
	repo    Repository
}

func NewModule() *Module {
	repo := NewRepository()
	return NewModuleWithRepo(repo)
}

func NewModuleWithRepo(repo Repository) *Module {
	svc := NewService(repo)
	return &Module{
		handler: NewHandler(svc),
		repo:    repo,
	}
}

func (m *Module) Repo() Repository { return m.repo }

func (m *Module) Name() string    { return "craftsmen" }
func (m *Module) TitleAr() string { return "الصنايعية وأصحاب الحرف" }
func (m *Module) Prefix() string  { return "/api/v1/craftsmen" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/create", m.handler.Create)
	mux.HandleFunc("/register", m.handler.Create)
	mux.HandleFunc("/", m.handler.GetDirectory)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
