package reports

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
)

type Repository interface {
	ListReportTypes(ctx context.Context) []ReportTypeDTO
	ListPublicReports(ctx context.Context) ([]PublicReportDTO, error)
	ListUserReports(ctx context.Context, userID, userPhone string) ([]PublicReportDTO, error)
	CreateReport(ctx context.Context, req CreateReportRequestDTO) (*PublicReportDTO, error)
}

type diskRepository struct {
	mu    sync.RWMutex
	store *database.PersistentFileStore
	items []PublicReportDTO
}

func NewRepository() Repository {
	repo := &diskRepository{
		store: database.NewPersistentFileStore("reports.json"),
		items: []PublicReportDTO{},
	}
	_ = repo.store.Load(&repo.items)
	if repo.items == nil {
		repo.items = []PublicReportDTO{}
	}
	return repo
}

func (r *diskRepository) ListReportTypes(ctx context.Context) []ReportTypeDTO {
	return []ReportTypeDTO{
		{Code: "sanitation", NameAr: "١. النظافة", Icon: "trash-outline"},
		{Code: "sewage", NameAr: "٢. الصرف الصحي", Icon: "water-outline"},
		{Code: "electricity", NameAr: "٣. الكهرباء والإنارة", Icon: "bulb-outline"},
		{Code: "roads", NameAr: "٤. الطرق", Icon: "navigate-outline"},
		{Code: "water", NameAr: "٥. المياه", Icon: "rainy-outline"},
		{Code: "encroachments", NameAr: "٦. الإشغالات", Icon: "alert-circle-outline"},
		{Code: "schools_facilities", NameAr: "٧. المدارس والمرافق", Icon: "school-outline"},
		{Code: "lost_and_found", NameAr: "٨. المفقودات", Icon: "search-outline"},
		{Code: "general", NameAr: "٩. البلاغات العامة", Icon: "document-text-outline"},
	}
}

func (r *diskRepository) ListPublicReports(ctx context.Context) ([]PublicReportDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]PublicReportDTO, 0, len(r.items))
	for _, item := range r.items {
		// البلاغ لا يُنشر عامة في التطبيق إلا بعد مراجعة المشرف والموافقة عليه
		if item.Status != "pending_approval" && item.Status != "rejected" {
			// حماية الخصوصية: تجريد البلاغ العام من أي بيانات شخصية للمواطن
			sanitized := item
			sanitized.UserID = ""
			sanitized.UserPhone = ""
			sanitized.UserName = ""
			sanitized.DeviceFingerprint = ""
			out = append(out, sanitized)
		}
	}
	return out, nil
}

// ListUserReports جلب البلاغات الخاصة بمواطن بعينه فقط (ممنوع أي شخص آخر يراها)
func (r *diskRepository) ListUserReports(ctx context.Context, userID, userPhone string) ([]PublicReportDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	cleanPhone := strings.TrimSpace(userPhone)
	cleanID := strings.TrimSpace(userID)

	out := make([]PublicReportDTO, 0)
	if cleanPhone == "" && cleanID == "" {
		return out, nil
	}

	for _, item := range r.items {
		isOwner := false
		if cleanPhone != "" && strings.TrimSpace(item.UserPhone) == cleanPhone {
			isOwner = true
		} else if cleanID != "" && strings.TrimSpace(item.UserID) == cleanID {
			isOwner = true
		}

		if isOwner {
			out = append(out, item)
		}
	}
	return out, nil
}

func (r *diskRepository) CreateReport(ctx context.Context, req CreateReportRequestDTO) (*PublicReportDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	nextNum := int64(len(r.items) + 1)
	rep := PublicReportDTO{
		ID:                fmt.Sprintf("rep-%d", now.UnixNano()),
		ReportNumber:      nextNum,
		UserID:            strings.TrimSpace(req.UserID),
		UserPhone:         strings.TrimSpace(req.UserPhone),
		UserName:          strings.TrimSpace(req.UserName),
		DeviceFingerprint: strings.TrimSpace(req.DeviceFingerprint),
		ReportType:        req.ReportType,
		ReportTypeAr:      req.ReportTypeAr,
		Title:             req.Title,
		Description:       req.Description,
		ManualAddress:     req.ManualAddress,
		ImageURL:          req.ImageURL,
		Status:            "pending_approval",
		StatusAr:          "قيد المراجعة والاعتماد",
		CreatedAt:         now,
	}

	r.items = append([]PublicReportDTO{rep}, r.items...)
	if err := r.store.Save(&r.items); err != nil {
		return nil, err
	}
	return &rep, nil
}
