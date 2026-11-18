package users

import (
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	prof, err := h.service.GetProfile(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "users", ErrCodeUsersUnavailable, ErrMsgUsersUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "users", "v1", prof, nil)
}
