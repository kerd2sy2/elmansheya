package middleware

import (
	"net/http"
	"strings"
)

// VersionProvider يرجع رقم النسخة الحالية للبيانات العامة (ETag)
type VersionProvider interface {
	CurrentVersion() string
}

// ETagMiddleware يمنع إعادة إرسال نفس البيانات لمليون مستخدم عند عمل Refresh.
// إذا كانت ترويسة If-None-Match مطابقة لنسخة السيرفر الحالية، يرد فوراً بـ 304 Not Modified (0 بايت)
// دون الدخول إلى الكود أو قاعدة البيانات.
func ETagMiddleware(vp VersionProvider, cacheControlSeconds int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet || r.Method == http.MethodHead {
				currentVer := vp.CurrentVersion()
				etagHeader := `"` + currentVer + `"`

				w.Header().Set("ETag", etagHeader)
				if cacheControlSeconds > 0 {
					w.Header().Set("Cache-Control",
						"public, max-age=5, s-maxage=15, stale-while-revalidate=60")
				}

				clientETag := strings.TrimSpace(r.Header.Get("If-None-Match"))
				if clientETag != "" && (clientETag == etagHeader || clientETag == currentVer) {
					w.WriteHeader(http.StatusNotModified)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
