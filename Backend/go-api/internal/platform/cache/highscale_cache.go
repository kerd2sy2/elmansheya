package cache

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

// CachedEntry يمثل البيانات المخزنة في ذاكرة السيرفر السريعة L1 مع رقم النسخة (ETag)
type CachedEntry struct {
	Payload   interface{}
	Version   string
	ExpiresAt time.Time
}

type inflightCall struct {
	wg  sync.WaitGroup
	val *CachedEntry
	err error
}

// HighScaleCache يوفر:
// 1. تخزين L1 في الذاكرة (RAM) للقراءة الفورية لملايين المستخدمين بدون لمس قاعدة البيانات.
// 2. Singleflight Request Coalescing: دمج مئات الآلاف من الطلبات المتزامنة في استعلام واحد فقط.
// 3. إدارة نسخ ETag (v1, v2...) لدعم استجابة 304 Not Modified بحجم 0 بايت.
// 4. تجميع عداد المشاهدات (Batched View Counter) لمنع قفل جداول قاعدة البيانات.
type HighScaleCache struct {
	mu          sync.RWMutex
	entries     map[string]*CachedEntry
	versionSeq  atomic.Uint64
	currentETag atomic.Value // string

	flightMu sync.Mutex
	flights  map[string]*inflightCall

	viewsMu     sync.Mutex
	pendingViews map[string]int64
}

func NewHighScaleCache() *HighScaleCache {
	c := &HighScaleCache{
		entries:      make(map[string]*CachedEntry),
		flights:      make(map[string]*inflightCall),
		pendingViews: make(map[string]int64),
	}
	initSeq := uint64(time.Now().UnixNano())
	c.versionSeq.Store(initSeq)
	c.currentETag.Store(fmt.Sprintf("v%d", initSeq))
	return c
}

// CurrentVersion يرجع بصمة النسخة الحالية (ETag) للبيانات العامة
func (c *HighScaleCache) CurrentVersion() string {
	v, _ := c.currentETag.Load().(string)
	return v
}

// InvalidateAndBumpVersion يُستدعى فقط عندما ينشر أو يعدل المشرف خبراً جديداً
func (c *HighScaleCache) InvalidateAndBumpVersion(prefix string) string {
	newVer := fmt.Sprintf("v%d", c.versionSeq.Add(1))
	c.currentETag.Store(newVer)

	c.mu.Lock()
	for k := range c.entries {
		if prefix == "" || len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.entries, k)
		}
	}
	c.mu.Unlock()
	return newVer
}

// GetOrFetchSingleflight يرجع البيانات من الذاكرة فوراً، وإذا انتهت صلاحيتها يدمج جميع الطلبات المتزامنة في استعلام واحد فقط
func (c *HighScaleCache) GetOrFetchSingleflight(key string, ttl time.Duration, loader func() (interface{}, error)) (*CachedEntry, error) {
	now := time.Now()

	// 1. فحص سريع من ذاكرة الـ RAM (بدون أي حظر للقراء المتزامنين)
	c.mu.RLock()
	if entry, ok := c.entries[key]; ok && now.Before(entry.ExpiresAt) {
		c.mu.RUnlock()
		return entry, nil
	}
	c.mu.RUnlock()

	// 2. خاصية Singleflight: لو دخل 500,000 مستخدم في نفس اللحظة، طلب واحد فقط ينفذ loader() والباقي ينتظر نتيجته
	c.flightMu.Lock()
	if call, ok := c.flights[key]; ok {
		c.flightMu.Unlock()
		call.wg.Wait()
		return call.val, call.err
	}
	call := &inflightCall{}
	call.wg.Add(1)
	c.flights[key] = call
	c.flightMu.Unlock()

	// تنفيذ الاستعلام مرة واحدة فقط
	data, err := loader()
	if err == nil {
		entry := &CachedEntry{
			Payload:   data,
			Version:   c.CurrentVersion(),
			ExpiresAt: time.Now().Add(ttl),
		}
		c.mu.Lock()
		c.entries[key] = entry
		c.mu.Unlock()
		call.val = entry
	}
	call.err = err
	call.wg.Done()

	c.flightMu.Lock()
	delete(c.flights, key)
	c.flightMu.Unlock()

	return call.val, call.err
}

// IncrementView يسجل مشاهدة الخبر في الذاكرة الذرية بدلاً من عمل UPDATE مباشر في PostgreSQL مع كل قارئ
func (c *HighScaleCache) IncrementView(newsID string) int64 {
	c.viewsMu.Lock()
	defer c.viewsMu.Unlock()
	c.pendingViews[newsID]++
	return c.pendingViews[newsID]
}

// FlushPendingViews يفرغ المشاهدات المتجمعة لترحيلها دفعة واحدة إلى PostgreSQL
func (c *HighScaleCache) FlushPendingViews() map[string]int64 {
	c.viewsMu.Lock()
	defer c.viewsMu.Unlock()
	if len(c.pendingViews) == 0 {
		return nil
	}
	snapshot := c.pendingViews
	c.pendingViews = make(map[string]int64)
	return snapshot
}
