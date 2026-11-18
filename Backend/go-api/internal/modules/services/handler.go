package services

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

func (h *Handler) GetCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.service.GetMainCategories(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "services", ErrCodeServicesUnavailable, ErrMsgServicesUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "services", "v1", map[string]interface{}{
		"categories": cats,
	}, nil)
}

func (h *Handler) GetItems(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	items, err := h.service.GetCategoryItems(r.Context(), slug)
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "services", ErrCodeServicesUnavailable, ErrMsgServicesUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "services", "v1", items, nil)
}

func (h *Handler) CreateItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "services", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req CreateServiceItemRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "services", "INVALID_BODY", "بيانات الخدمة غير صالحة")
		return
	}

	item, err := h.service.AddServiceItem(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "services", "CREATE_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "services", "v1", item, nil)
}
