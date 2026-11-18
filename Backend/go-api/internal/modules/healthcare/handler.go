package healthcare

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetEntities(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.GetEntities(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "healthcare", ErrCodeHealthcareUnavailable, ErrMsgHealthcareUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "healthcare", "v1", items, nil)
}
