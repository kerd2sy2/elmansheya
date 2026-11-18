package verification

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

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	data := h.service.GetUserVerificationStatus(r.Context(), userID)
	response.JSON(w, http.StatusOK, "verification", "v1", data, nil)
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "verification", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var dto SubmitVerificationRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "verification", ErrCodeInvalidIDDocument, ErrMsgInvalidIDDocumentAr)
		return
	}

	req, err := h.service.SubmitRequest(r.Context(), dto)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "verification", ErrCodeInvalidIDDocument, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "verification", "v1", req, nil)
}

func (h *Handler) Review(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "verification", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var dto SupportReviewRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "verification", "INVALID_BODY", "بيانات المراجعة غير صالحة")
		return
	}

	req, err := h.service.ReviewRequest(r.Context(), dto)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "verification", ErrCodeRequestNotFound, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "verification", "v1", req, nil)
}
