package auth

import (
	"net/http"
	"time"

	"elmansheya/go-api/internal/platform/middleware"
)

type Module struct {
	handler     *Handler
	rateLimiter *middleware.LoginRateLimiter
}

func NewModule() *Module {
	repo := NewRepository()
	svc := NewService(repo)
	return &Module{
		handler:     NewHandler(svc),
		rateLimiter: middleware.NewLoginRateLimiter(10, time.Minute),
	}
}

func (m *Module) Name() string    { return "auth" }
func (m *Module) TitleAr() string { return "تسجيل الدخول والمصادقة" }
func (m *Module) Prefix() string  { return "/api/v1/auth" }

func (m *Module) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/login", m.rateLimiter.Limit("auth", m.handler.Login))
	mux.HandleFunc("/register", m.handler.Register)
	mux.HandleFunc("/refresh", m.handler.Refresh)
	mux.HandleFunc("/check-device", m.handler.CheckDevice)
	mux.HandleFunc("/biometric-login", m.rateLimiter.Limit("auth", m.handler.BiometricLogin))
	mux.HandleFunc("/change-password", m.handler.ChangePassword)
	mux.HandleFunc("/logout", middleware.RequireAuth("auth", m.handler.Logout))
	return mux
}

func (m *Module) HealthCheck() error { return nil }
