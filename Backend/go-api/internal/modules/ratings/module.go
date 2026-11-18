package ratings

import (
	"net/http"

	"elmansheya/go-api/internal/modules/craftsmen"
)

type Module struct{ handler *Handler }

func NewModule(craftsmenRepo craftsmen.Repository) *Module {
	repo := NewRepository()
	service := NewService(repo, craftsmenRepo)
	return &Module{handler: NewHandler(service)}
}

func (m *Module) Name() string    { return "ratings" }
func (m *Module) TitleAr() string { return "تقييمات الصنايعية" }
func (m *Module) Prefix() string  { return "/api/v1/ratings" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/submit", m.handler.SubmitRating)
	mux.HandleFunc("/", m.handler.GetRatings)
	return mux
}

func (m *Module) HealthCheck() error { return nil }
