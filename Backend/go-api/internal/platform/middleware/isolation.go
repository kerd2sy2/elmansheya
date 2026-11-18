package middleware

import (
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"elmansheya/go-api/internal/platform/response"
)

// ModuleFaultObserver يتيح لسجل الموديولات معرفة ما إذا حدث خطأ داخل موديول معينة دون إيقاف باقي الموديولات
type ModuleFaultObserver func(moduleName string, recovered interface{})

// ModuleIsolationMiddleware يغلف كل موديول بشكل مستقل تماماً (Bulkhead / Fault Isolation Pattern).
// إذا حدث Panic أو خطأ غير متوقع داخل الموديول، يتم اصطياده فوراً وإرجاع رسالة عربية تخص هذه الموديول فقط،
// بينما يظل الخادم وباقي الموديولات يعملان بنسبة 100%.
func ModuleIsolationMiddleware(moduleName string, moduleTitleAr string, onFault ModuleFaultObserver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Printf("[MODULE_ISOLATION_GUARD] module=%s path=%s panic=%v\n%s",
						moduleName, r.URL.Path, rec, string(debug.Stack()))

					if onFault != nil {
						onFault(moduleName, rec)
					}

					msg := fmt.Sprintf("عذراً، حدث عطل مؤقت في قسم (%s) فقط، بينما تعمل باقي أقسام التطبيق بشكل طبيعي. يرجى إعادة المحاولة.", moduleTitleAr)
					response.ModuleError(w, http.StatusServiceUnavailable, moduleName, "MODULE_ISOLATED_FAULT", msg)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
