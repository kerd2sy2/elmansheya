package notifications

import "context"

type Repository interface {
	ListChannels(ctx context.Context) []NotificationChannelDTO
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListChannels(ctx context.Context) []NotificationChannelDTO {
	// الأنواع الـ 8 المستقلة للإشعارات طبقاً للبند 9
	return []NotificationChannelDTO{
		{Code: "breaking_news", NameAr: "الأخبار العاجلة", Enabled: true},
		{Code: "new_news", NameAr: "الأخبار الجديدة", Enabled: true},
		{Code: "events", NameAr: "المناسبات", Enabled: true},
		{Code: "services", NameAr: "الخدمات", Enabled: true},
		{Code: "humanitarian_cases", NameAr: "الحالات الإنسانية", Enabled: true},
		{Code: "report_updates", NameAr: "تحديثات البلاغات", Enabled: true},
		{Code: "verification_updates", NameAr: "تحديثات توثيق الحساب", Enabled: true},
		{Code: "admin_announcements", NameAr: "الإعلانات الإدارية", Enabled: true},
	}
}
