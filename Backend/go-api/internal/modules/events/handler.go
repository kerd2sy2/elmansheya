package events

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetEvents(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.GetEvents(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "events", ErrCodeEventsUnavailable, ErrMsgEventsUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "events", "v1", items, nil)
}
