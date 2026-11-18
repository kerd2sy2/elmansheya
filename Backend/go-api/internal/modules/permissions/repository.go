package permissions

import "context"

type Repository interface {
	ListRoles(ctx context.Context) []RoleDTO
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListRoles(ctx context.Context) []RoleDTO {
	// الأدوار الـ 7 وصلاحياتها طبقاً للبند 11
	return []RoleDTO{
		{Code: "citizen", NameAr: "المواطن", Permissions: "مشاهدة المحتوى وتقديم البلاغات والتقييمات"},
		{Code: "general_supervisor", NameAr: "المشرف العام", Permissions: "إدارة المحتوى وجميع الأقسام"},
		{Code: "news_supervisor", NameAr: "مشرف الأخبار", Permissions: "إدارة الأخبار حسب الصلاحيات"},
		{Code: "services_supervisor", NameAr: "مشرف الخدمات", Permissions: "إدارة الخدمات المخصصة"},
		{Code: "reports_supervisor", NameAr: "مشرف البلاغات", Permissions: "مراجعة البلاغات ومتابعتها"},
		{Code: "support_agent", NameAr: "موظف الدعم", Permissions: "مراجعة طلبات توثيق الحساب ومساعدة المواطنين"},
		{Code: "system_admin", NameAr: "مدير النظام", Permissions: "إدارة النظام والمشرفين والصلاحيات"},
	}
}
