package humanitarian

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetCases(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.GetCases(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "humanitarian", ErrCodeHumanitarianUnavailable, ErrMsgHumanitarianUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "humanitarian", "v1", items, nil)
}
