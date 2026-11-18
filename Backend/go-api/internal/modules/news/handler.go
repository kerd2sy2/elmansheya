package news

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

func (h *Handler) GetFeed(w http.ResponseWriter, r *http.Request) {
	cursor := r.URL.Query().Get("cursor")
	feed, version, err := h.service.GetHomeFeed(r.Context(), cursor, 30)
	if err != nil {
		response.ModuleError(w, http.StatusServiceUnavailable, "news", ErrCodeNewsUnavailable, ErrMsgNewsUnavailableAr)
		return
	}

	// كاش فائق السرعة لـ Cloudflare وسيرفرات الحافة: يخدم آلاف المواطنين في أجزاء من الثانية مع حماية تامة لقاعدة البيانات
	w.Header().Set("Cache-Control", "public, max-age=30, s-maxage=300, stale-while-revalidate=600")

	ifNoneMatch := r.Header.Get("If-None-Match")
	if version != "" && ifNoneMatch != "" && (ifNoneMatch == version || ifNoneMatch == `"`+version+`"`) {
		w.Header().Set("ETag", `"`+version+`"`)
		w.WriteHeader(http.StatusNotModified)
		return
	}

	response.JSON(w, http.StatusOK, "news", version, feed, map[string]interface{}{
		"next_cursor": feed.NextCursor,
		"has_more":    feed.HasMore,
	})
}

func (h *Handler) Publish(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.ModuleError(w, http.StatusMethodNotAllowed, "news", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}

	var req PublishNewsRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.ModuleError(w, http.StatusBadRequest, "news", "INVALID_BODY", "بيانات الخبر غير صالحة")
		return
	}

	card, newVer, err := h.service.PublishNews(r.Context(), req)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "news", "PUBLISH_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "news", newVer, card, nil)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		response.ModuleError(w, http.StatusMethodNotAllowed, "news", "METHOD_NOT_ALLOWED", "الطريقة غير مسموحة")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		var req struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		id = req.ID
	}
	if id == "" {
		response.ModuleError(w, http.StatusBadRequest, "news", "MISSING_ID", "معرف الخبر مطلوب")
		return
	}
	newVer, err := h.service.DeleteNews(r.Context(), id)
	if err != nil {
		response.ModuleError(w, http.StatusBadRequest, "news", "DELETE_FAILED", err.Error())
		return
	}
	response.JSON(w, http.StatusOK, "news", newVer, map[string]string{"deleted_id": id}, nil)
}

func (h *Handler) GetDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.ModuleError(w, http.StatusBadRequest, "news", "MISSING_ID", "معرف الخبر مطلوب")
		return
	}

	card, err := h.service.GetNewsDetail(r.Context(), id)
	if err != nil {
		response.ModuleError(w, http.StatusNotFound, "news", "NEWS_NOT_FOUND", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "news", "v1", card, nil)
}
