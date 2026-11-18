package audit_logs

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.GetLogs(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "audit_logs", ErrCodeAuditLogsUnavailable, ErrMsgAuditLogsUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "audit_logs", "v1", items, nil)
}
