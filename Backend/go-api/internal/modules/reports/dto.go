package reports

import "time"

type ReportTypeDTO struct {
	Code   string `json:"code"`
	NameAr string `json:"name_ar"`
	Icon   string `json:"icon"`
}

// PublicReportDTO لا يحتوي نهائياً على اسم أو بيانات صاحب البلاغ في العرض العام حفاظاً على الخصوصية (البند 6.8 و 6.9)
type PublicReportDTO struct {
	ID                string    `json:"id"`
	ReportNumber      int64     `json:"report_number"`
	UserID            string    `json:"user_id,omitempty"`
	UserPhone         string    `json:"user_phone,omitempty"`
	UserName          string    `json:"user_name,omitempty"`
	DeviceFingerprint string    `json:"device_fingerprint,omitempty"`
	ReportType        string    `json:"report_type"`
	ReportTypeAr      string    `json:"report_type_ar"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	ManualAddress     string    `json:"manual_address"`
	ImageURL          string    `json:"image_url,omitempty"`
	Status            string    `json:"status"`
	StatusAr          string    `json:"status_ar"`
	ResolutionSummary string    `json:"resolution_summary,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type CreateReportRequestDTO struct {
	UserID            string `json:"user_id,omitempty"`
	UserPhone         string `json:"user_phone,omitempty"`
	UserName          string `json:"user_name,omitempty"`
	DeviceFingerprint string `json:"device_fingerprint,omitempty"`
	ReportType        string `json:"report_type"`
	ReportTypeAr      string `json:"report_type_ar"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	ManualAddress     string `json:"manual_address"`
	ImageURL          string `json:"image_url,omitempty"`
}
