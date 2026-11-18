package ratings

import (
	"encoding/json"
	"net/http"

	"elmansheya/go-api/internal/platform/response"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) GetRatings(w http.ResponseWriter, r *http.Request) {
	craftsmanID := r.URL.Query().Get("craftsman_id")
	items, err := h.service.GetRatings(r.Context(), craftsmanID)
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "ratings", ErrCodeRatingsUnavailable, ErrMsgRatingsUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "ratings", "v1", items, nil)
}

func (h *Handler) SubmitRating(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "ratings", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req SubmitRatingRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "ratings", "INVALID_BODY", "بيانات التقييم غير صالحة")
		return
	}

	if req.CraftsmanID == "" || req.Stars < 1 || req.Stars > 5 {
		response.ModuleError(w, http.StatusBadRequest, "ratings", "INVALID_DATA", "يجب تحديد الصنايعي وعدد النجوم من 1 إلى 5")
		return
	}

	dto, err := h.service.SubmitRating(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "ratings", "SAVE_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "ratings", "v1", dto, nil)
}
