package verification

import "time"

type VerificationStateDTO struct {
	Code        string `json:"code"`
	TitleAr     string `json:"title_ar"`
	Description string `json:"description"`
}

type SubmitVerificationRequestDTO struct {
	UserID            string `json:"user_id"`
	CitizenName       string `json:"citizen_name"`
	IDCardFrontBase64 string `json:"id_card_front_base64"`
	IDCardBackBase64  string `json:"id_card_back_base64,omitempty"`
}

type SupportReviewRequestDTO struct {
	RequestID  string `json:"request_id"`
	NewStatus  string `json:"new_status"` // verified | rejected | reupload_required
	Notes      string `json:"notes"`
	ReviewerID string `json:"reviewer_id"`
}

type VerificationRequestDetailsDTO struct {
	ID              string     `json:"id"`
	RequestNumber   int64      `json:"request_number"`
	UserID          string     `json:"user_id"`
	CitizenName     string     `json:"citizen_name"`
	EncryptedKeyRef string     `json:"encrypted_key_ref"`
	EncryptionKeyID string     `json:"encryption_key_id"`
	Status          string     `json:"status"`
	StatusLabelAr   string     `json:"status_label_ar"`
	SupportNotes    string     `json:"support_notes,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	ReviewerNameAr  string     `json:"reviewer_name_ar,omitempty"`
}
