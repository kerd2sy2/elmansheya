package notifications

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, "notifications", "v1", map[string]interface{}{
		"channels": h.service.GetChannels(r.Context()),
	}, nil)
}
