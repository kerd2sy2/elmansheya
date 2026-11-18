package registry_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"elmansheya/go-api/internal/modules/news"
	"elmansheya/go-api/internal/platform/cache"
	"elmansheya/go-api/internal/platform/registry"
	"elmansheya/go-api/internal/platform/response"
)

// brokenModule يمثل موديول بها خطأ قاتل (Panic) لاختبار أن باقي التطبيق لا يتأثر إطلاقاً
type brokenModule struct{}

func (b *brokenModule) Name() string        { return "broken_module" }
func (b *brokenModule) TitleAr() string     { return "الموديول التجريبي المتعطل" }
func (b *brokenModule) Prefix() string      { return "/api/v1/broken" }
func (b *brokenModule) HealthCheck() error  { return nil }
func (b *brokenModule) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		panic("database pointer nil in broken_module")
	})
	return mux
}

func TestModuleFaultIsolation_OtherModulesKeepWorking(t *testing.T) {
	reg := registry.NewModuleRegistry()
	highCache := cache.NewHighScaleCache()

	reg.Register(news.NewModule(highCache, 30*time.Second))
	reg.Register(&brokenModule{})

	mux := http.NewServeMux()
	reg.MountAll(mux)

	// 1. نضرب الموديول المتعطلة التي ترمي Panic
	reqBroken := httptest.NewRequest(http.MethodGet, "/api/v1/broken/", nil)
	recBroken := httptest.NewRecorder()
	mux.ServeHTTP(recBroken, reqBroken)

	if recBroken.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 for broken module, got %d", recBroken.Code)
	}

	var brokenEnv response.Envelope
	if err := json.Unmarshal(recBroken.Body.Bytes(), &brokenEnv); err != nil {
		t.Fatalf("failed to decode broken module response: %v", err)
	}
	if !brokenEnv.Isolated || brokenEnv.Module != "broken_module" {
		t.Fatalf("expected isolated error for broken_module, got %+v", brokenEnv)
	}

	// 2. نتحقق أن موديول الأخبار (وباقي التطبيق) يعمل بشكل طبيعي 100% بعد تعطل الموديول الأخرى!
	reqNews := httptest.NewRequest(http.MethodGet, "/api/v1/news/feed", nil)
	recNews := httptest.NewRecorder()
	mux.ServeHTTP(recNews, reqNews)

	if recNews.Code != http.StatusOK {
		t.Fatalf("expected news module to stay 200 OK, got %d", recNews.Code)
	}

	// 3. نتحقق أن طلب Refresh بنفس الـ ETag يرجع 304 Not Modified بحجم 0 بايت!
	etag := recNews.Header().Get("ETag")
	reqRefresh := httptest.NewRequest(http.MethodGet, "/api/v1/news/feed", nil)
	reqRefresh.Header.Set("If-None-Match", etag)
	recRefresh := httptest.NewRecorder()
	mux.ServeHTTP(recRefresh, reqRefresh)

	if recRefresh.Code != http.StatusNotModified {
		t.Fatalf("expected 304 Not Modified on matching ETag, got %d", recRefresh.Code)
	}
	if recRefresh.Body.Len() != 0 {
		t.Fatalf("expected 0 byte body on 304 Not Modified, got %d bytes", recRefresh.Body.Len())
	}
}
