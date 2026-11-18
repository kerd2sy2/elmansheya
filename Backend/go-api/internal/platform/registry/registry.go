package registry

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/middleware"
	"elmansheya/go-api/internal/platform/response"
)

// Module represents an independent backend domain module
type Module interface {
	Name() string
	TitleAr() string
	Prefix() string
	Routes() http.Handler
	HealthCheck() error
}

type ModuleStatus struct {
	Name          string     `json:"name"`
	TitleAr       string     `json:"title_ar"`
	Prefix        string     `json:"prefix"`
	Status        string     `json:"status"` // HEALTHY | DEGRADED
	FaultCount    uint64     `json:"fault_count"`
	LastFaultAt   *time.Time `json:"last_fault_at,omitempty"`
	LastFaultInfo string     `json:"last_fault_info,omitempty"`
}

// ModuleRegistry يدير تسجيل وعزل جميع الموديولات الـ 14 في السيرفر
type ModuleRegistry struct {
	mu       sync.RWMutex
	modules  []Module
	statuses map[string]*ModuleStatus
}

func NewModuleRegistry() *ModuleRegistry {
	return &ModuleRegistry{
		modules:  make([]Module, 0, 16),
		statuses: make(map[string]*ModuleStatus),
	}
}

// Register يسجل موديول مستقلة ولا يسمح لأي عطل فيها بإيقاف السيرفر
func (mr *ModuleRegistry) Register(m Module) {
	mr.mu.Lock()
	defer mr.mu.Unlock()

	status := "HEALTHY"
	var faultInfo string
	if err := m.HealthCheck(); err != nil {
		status = "DEGRADED"
		faultInfo = err.Error()
	}

	mr.modules = append(mr.modules, m)
	mr.statuses[m.Name()] = &ModuleStatus{
		Name:          m.Name(),
		TitleAr:       m.TitleAr(),
		Prefix:        m.Prefix(),
		Status:        status,
		LastFaultInfo: faultInfo,
	}
}

func (mr *ModuleRegistry) recordFault(moduleName string, rec interface{}) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	if st, ok := mr.statuses[moduleName]; ok {
		now := time.Now()
		st.Status = "DEGRADED"
		st.FaultCount++
		st.LastFaultAt = &now
		st.LastFaultInfo = fmt.Sprintf("%v", rec)
	}
}

// MountAll يربط كل موديول بمسارها المستقل مع جدار الحماية والعزل الخاص بها (ModuleIsolationMiddleware)
func (mr *ModuleRegistry) MountAll(rootMux *http.ServeMux) {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	for _, mod := range mr.modules {
		stripped := stripAndNormalizePrefix(mod.Prefix(), mod.Routes())
		isolatedHandler := middleware.ModuleIsolationMiddleware(
			mod.Name(),
			mod.TitleAr(),
			mr.recordFault,
		)(stripped)

		rootMux.Handle(mod.Prefix()+"/", isolatedHandler)
		rootMux.Handle(mod.Prefix(), isolatedHandler)
	}

	// نقطة فحص صحة جميع الموديولات بشكل مستقل
	rootMux.HandleFunc("/api/v1/health/modules", mr.handleModulesHealth)
}

func (mr *ModuleRegistry) handleModulesHealth(w http.ResponseWriter, r *http.Request) {
	mr.mu.RLock()
	list := make([]ModuleStatus, 0, len(mr.modules))
	for _, m := range mr.modules {
		st := *mr.statuses[m.Name()]
		if err := m.HealthCheck(); err != nil {
			st.Status = "DEGRADED"
			st.LastFaultInfo = err.Error()
		}
		list = append(list, st)
	}
	mr.mu.RUnlock()

	response.JSON(w, http.StatusOK, "system", "v1", map[string]interface{}{
		"total_modules": len(list),
		"modules":       list,
	}, nil)
}

func stripAndNormalizePrefix(prefix string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, prefix)
		if p == "" || p == "/" {
			p = "/"
		}
		r2 := new(http.Request)
		*r2 = *r
		r2.URL = new(url.URL)
		*r2.URL = *r.URL
		r2.URL.Path = p
		h.ServeHTTP(w, r2)
	})
}
