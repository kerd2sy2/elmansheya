package craftsmen

import (
	"encoding/json"
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetDirectory(w http.ResponseWriter, r *http.Request) {
	cats, items, err := h.service.GetDirectory(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "craftsmen", ErrCodeCraftsmenUnavailable, ErrMsgCraftsmenUnavailableAr)
		return
	}

	response.JSON(w, http.StatusOK, "craftsmen", "v1", map[string]interface{}{
		"categories": cats,
		"craftsmen":  items,
	}, nil)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "craftsmen", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req CreateCraftsmanRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "craftsmen", "INVALID_BODY", "بيانات الصنايعي غير صالحة")
		return
	}

	card, err := h.service.AddCraftsman(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "craftsmen", "CREATE_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, "craftsmen", "v1", card, nil)
}
