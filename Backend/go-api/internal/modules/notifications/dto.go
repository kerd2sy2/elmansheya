package notifications

type NotificationChannelDTO struct {
	Code    string `json:"code"`
	NameAr  string `json:"name_ar"`
	Enabled bool   `json:"enabled"`
}
