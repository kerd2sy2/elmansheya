package auth

import (
	"encoding/json"
	"net/http"
	"strings"

	"elmansheya/go-api/internal/platform/middleware"
	"elmansheya/go-api/internal/platform/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "auth", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req LoginRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_BODY", "بيانات تسجيل الدخول غير صالحة")
		return
	}

	res, code, err := h.service.Login(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusUnauthorized, "auth", code, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, "auth", "v1", res, nil)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "auth", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req RegisterRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_BODY", "بيانات إنشاء الحساب غير صالحة")
		return
	}

	res, code, err := h.service.Register(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", code, err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, "auth", "v1", res, nil)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "auth", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req RefreshRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_BODY", "رمز التحديث مطلوب")
		return
	}

	res, code, err := h.service.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		response.ModuleError(w, http.StatusUnauthorized, "auth", code, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, "auth", "v1", res, nil)
}

func (h *Handler) BiometricLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "auth", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req BiometricLoginRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_BODY", "بيانات الدخول بالبصمة غير صالحة")
		return
	}

	res, code, err := h.service.BiometricUnlock(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusUnauthorized, "auth", code, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, "auth", "v1", res, nil)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	sessionID := middleware.GetSessionID(r.Context())
	_ = h.service.Logout(r.Context(), sessionID)
	response.JSON(w, http.StatusOK, "auth", "v1", map[string]interface{}{
		"logged_out":       true,
		"require_password": true,
		"message":          "تم تسجيل الخروج بنجاح. عند الدخول القادم سيتم طلب كلمة المرور أو البصمة.",
	}, nil)
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "auth", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req ChangePasswordRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_BODY", "بيانات طلب تغيير كلمة السر غير صالحة")
		return
	}

	cleanPhone := strings.TrimSpace(req.Phone)
	cleanPass := strings.TrimSpace(req.NewPassword)
	if cleanPhone == "" || cleanPass == "" {
		response.ModuleError(w, http.StatusBadRequest, "auth", "INVALID_INPUT", "يرجى تحديد رقم الهاتف وكلمة السر الجديدة")
		return
	}

	code, err := h.service.ChangePassword(r.Context(), cleanPhone, cleanPass)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "auth", code, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "auth", "v1", map[string]interface{}{
		"changed": true,
		"message": "تم تحديث كلمة السر بنجاح.",
	}, nil)
}

func (h *Handler) CheckDevice(w http.ResponseWriter, r *http.Request) {
	fp := strings.TrimSpace(r.URL.Query().Get("device_fingerprint"))
	if fp == "" {
		response.JSON(w, http.StatusOK, "auth", "v1", map[string]interface{}{
			"bound": false,
		}, nil)
		return
	}

	acc, err := h.service.GetAccountByDevice(r.Context(), fp)
	if err != nil || acc == nil {
		response.JSON(w, http.StatusOK, "auth", "v1", map[string]interface{}{
			"bound": false,
		}, nil)
		return
	}

	response.JSON(w, http.StatusOK, "auth", "v1", map[string]interface{}{
		"bound":     true,
		"phone":     acc.Phone,
		"full_name": acc.FullName,
		"user_id":   acc.ID,
	}, nil)
}
