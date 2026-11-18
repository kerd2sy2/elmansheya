package permissions

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetRoles(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, "permissions", "v1", map[string]interface{}{
		"roles": h.service.GetRoles(r.Context()),
	}, nil)
}
