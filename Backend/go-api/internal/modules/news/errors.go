package news

// أكواد الأخطاء المحلية الخاصة بموديول الأخبار فقط
const (
	ErrCodeNewsNotFound    = "NEWS_NOT_FOUND"
	ErrCodeNewsUnavailable = "NEWS_SERVICE_UNAVAILABLE"
)

const (
	ErrMsgNewsNotFoundAr    = "الخبر المطلوب غير موجود أو تم نقله إلى الأرشيف."
	ErrMsgNewsUnavailableAr = "تعذر تحميل الأخبار في الوقت الحالي، يرجى المحاولة مرة أخرى."
)
