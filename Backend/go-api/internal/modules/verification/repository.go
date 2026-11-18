package verification

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type Repository interface {
	ListStates(ctx context.Context) []VerificationStateDTO
	SaveRequest(ctx context.Context, req *VerificationRequestDetailsDTO) error
	GetLatestByUser(ctx context.Context, userID string) (*VerificationRequestDetailsDTO, error)
	UpdateReviewStatus(ctx context.Context, requestID string, newStatus string, statusAr string, notes string, reviewerName string) (*VerificationRequestDetailsDTO, error)
}

type memoryRepository struct {
	mu       sync.RWMutex
	seq      int64
	byUser   map[string]*VerificationRequestDetailsDTO
	byReqID  map[string]*VerificationRequestDetailsDTO
}

func NewRepository() Repository {
	return &memoryRepository{
		seq:     1000,
		byUser:  make(map[string]*VerificationRequestDetailsDTO),
		byReqID: make(map[string]*VerificationRequestDetailsDTO),
	}
}

func (r *memoryRepository) ListStates(ctx context.Context) []VerificationStateDTO {
	// حالات التوثيق الـ 5 طبقاً للبند 8.3
	return []VerificationStateDTO{
		{Code: "unverified", TitleAr: "غير موثق", Description: "لم يتم إرسال طلب"},
		{Code: "pending_review", TitleAr: "قيد المراجعة", Description: "تم إرسال الطلب وينتظر مراجعة الدعم"},
		{Code: "verified", TitleAr: "موثق", Description: "تمت الموافقة على الطلب"},
		{Code: "rejected", TitleAr: "مرفوض", Description: "تم رفض الطلب مع توضيح السبب"},
		{Code: "reupload_required", TitleAr: "مطلوب إعادة الرفع", Description: "الصورة غير واضحة أو تحتاج إلى استبدال"},
	}
}

func (r *memoryRepository) SaveRequest(ctx context.Context, req *VerificationRequestDetailsDTO) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.seq++
	req.RequestNumber = r.seq
	req.ID = fmt.Sprintf("vreq-%d", r.seq)
	req.SubmittedAt = time.Now()
	r.byUser[req.UserID] = req
	r.byReqID[req.ID] = req
	return nil
}

func (r *memoryRepository) GetLatestByUser(ctx context.Context, userID string) (*VerificationRequestDetailsDTO, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	req, ok := r.byUser[userID]
	if !ok {
		return nil, errors.New("not found")
	}
	copyReq := *req
	return &copyReq, nil
}

func (r *memoryRepository) UpdateReviewStatus(
	ctx context.Context,
	requestID string,
	newStatus string,
	statusAr string,
	notes string,
	reviewerName string,
) (*VerificationRequestDetailsDTO, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	req, ok := r.byReqID[requestID]
	if !ok {
		return nil, errors.New("not found")
	}
	now := time.Now()
	req.Status = newStatus
	req.StatusLabelAr = statusAr
	req.SupportNotes = notes
	req.ReviewedAt = &now
	req.ReviewerNameAr = reviewerName
	copyReq := *req
	return &copyReq, nil
}
