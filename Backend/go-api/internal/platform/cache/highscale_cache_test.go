package cache_test

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"elmansheya/go-api/internal/platform/cache"
)

func TestSingleflight_OneDatabaseCallForThousandConcurrentUsers(t *testing.T) {
	hc := cache.NewHighScaleCache()
	var dbCalls atomic.Int32

	const concurrentUsers = 1000
	var wg sync.WaitGroup
	wg.Add(concurrentUsers)

	for i := 0; i < concurrentUsers; i++ {
		go func() {
			defer wg.Done()
			entry, err := hc.GetOrFetchSingleflight("news:feed:main", 30*time.Second, func() (interface{}, error) {
				dbCalls.Add(1)
				time.Sleep(20 * time.Millisecond) // محاكاة زمن استعلام قاعدة البيانات
				return "shared_news_payload", nil
			})
			if err != nil || entry == nil || entry.Payload != "shared_news_payload" {
				t.Errorf("unexpected result: entry=%v err=%v", entry, err)
			}
		}()
	}

	wg.Wait()

	// رغم دخول 1000 مستخدم في نفس اللحظة، لا يجب أن يُنفذ سوى استعلام واحد فقط!
	if got := dbCalls.Load(); got != 1 {
		t.Fatalf("expected exactly 1 DB query for %d concurrent requests, got %d", concurrentUsers, got)
	}
}
