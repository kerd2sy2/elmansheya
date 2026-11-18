package verification

import (
	"context"
	"errors"
	"strings"

	"elmansheya/go-api/internal/platform/storage"
)

type Service struct {
	repo  Repository
	vault *storage.PrivateIDVault
}

func NewService(repo Repository) *Service {
	return &Service{
		repo:  repo,
		vault: storage.NewPrivateIDVault(),
	}
}

func (s *Service) GetStates(ctx context.Context) []VerificationStateDTO {
	return s.repo.ListStates(ctx)
}

func (s *Service) GetUserVerificationStatus(ctx context.Context, userID string) map[string]interface{} {
	if userID == "" {
		userID = "usr-1"
	}
	req, err := s.repo.GetLatestByUser(ctx, userID)
	if err != nil {
		return map[string]interface{}{
			"current_status":   "unverified",
			"status_label_ar":  "غير موثق",
			"request_details":  nil,
			"states":           s.repo.ListStates(ctx),
			"security_policy":  "تُحفظ صورة البطاقة مشفرة في مساحة خاصة غير عامة، ولا يطلع عليها سوى موظف الدعم المختص مع تسجيل كل عملية مراجعة.",
		}
	}

	return map[string]interface{}{
		"current_status":  req.Status,
		"status_label_ar": req.StatusLabelAr,
		"request_details": req,
		"states":          s.repo.ListStates(ctx),
		"security_policy": "تُحفظ صورة البطاقة مشفرة في مساحة خاصة غير عامة، ولا يطلع عليها سوى موظف الدعم المختص مع تسجيل كل عملية مراجعة.",
	}
}

// SubmitRequest يشفر صورة البطاقة في المساحة الخاصة (PrivateIDVault) وينشئ طلب توثيق بحالة قيد المراجعة
func (s *Service) SubmitRequest(ctx context.Context, dto SubmitVerificationRequestDTO) (*VerificationRequestDetailsDTO, error) {
	if strings.TrimSpace(dto.IDCardFrontBase64) == "" {
		return nil, errors.New(ErrMsgInvalidIDDocumentAr)
	}
	userID := dto.UserID
	if userID == "" {
		userID = "usr-1"
	}

	objKey, keyID, err := s.vault.StoreEncryptedIDCard(userID, dto.IDCardFrontBase64, "image/jpeg")
	if err != nil {
		return nil, err
	}

	req := &VerificationRequestDetailsDTO{
		UserID:          userID,
		CitizenName:     dto.CitizenName,
		EncryptedKeyRef: objKey,
		EncryptionKeyID: keyID,
		Status:          "pending_review",
		StatusLabelAr:   "قيد المراجعة",
		SupportNotes:    "تم استلام صورة البطاقة المشفرة وجارٍ مراجعتها من فريق الدعم.",
	}

	if err := s.repo.SaveRequest(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

// ReviewRequest يتيح لموظف الدعم اعتماد الحساب أو رفضه أو طلب إعادة رفع الصورة
func (s *Service) ReviewRequest(ctx context.Context, dto SupportReviewRequestDTO) (*VerificationRequestDetailsDTO, error) {
	statusLabels := map[string]string{
		"verified":          "موثق",
		"rejected":          "مرفوض",
		"reupload_required": "مطلوب إعادة الرفع",
		"pending_review":    "قيد المراجعة",
	}
	label, ok := statusLabels[dto.NewStatus]
	if !ok {
		return nil, errors.New("حالة التوثيق غير صالحة")
	}

	return s.repo.UpdateReviewStatus(
		ctx,
		dto.RequestID,
		dto.NewStatus,
		label,
		dto.Notes,
		"موظف دعم وتوثيق المنشية",
	)
}
