package reports

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

func (h *Handler) GetPublicOverview(w http.ResponseWriter, r *http.Request) {
	types, list, err := h.service.GetOverview(r.Context())
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "reports", ErrCodeReportsUnavailable, ErrMsgReportsUnavailableAr)
		return
	}
	response.JSON(w, http.StatusOK, "reports", "v1", map[string]interface{}{
		"report_types":   types,
		"public_reports": list,
	}, nil)
}

func (h *Handler) GetMyReports(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	userPhone := r.URL.Query().Get("phone")

	// إذا لم يتم تمرير أي تعريف للمستخدم نرجع قائمة فارغة صريحة
	if userID == "" && userPhone == "" {
		response.JSON(w, http.StatusOK, "reports", "v1", []PublicReportDTO{}, nil)
		return
	}

	userReports, err := h.service.GetUserReports(r.Context(), userID, userPhone)
	if err != nil {
		response.ModuleError(w, http.StatusInternalServerError, "reports", "FETCH_FAILED", "تعذر جلب بلاغات المستخدم")
		return
	}

	response.JSON(w, http.StatusOK, "reports", "v1", userReports, nil)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "reports", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req CreateReportRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "reports", "INVALID_BODY", "بيانات البلاغ غير صالحة")
		return
	}

	rep, err := h.service.SubmitReport(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "reports", "CREATE_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "reports", "v1", rep, nil)
}
