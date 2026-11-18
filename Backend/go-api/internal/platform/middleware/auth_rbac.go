package middleware

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"elmansheya/go-api/internal/platform/database"
	"elmansheya/go-api/internal/platform/response"
	"elmansheya/go-api/internal/platform/security"
)

type ctxKey string

const (
	CtxUserIDKey    ctxKey = "auth_user_id"
	CtxUserPhoneKey ctxKey = "auth_user_phone"
	CtxUserRoleKey  ctxKey = "auth_user_role"
	CtxSessionIDKey ctxKey = "auth_session_id"
)

type fallbackAccount struct {
	ID       string `json:"ID"`
	FullName string `json:"FullName"`
	Phone    string `json:"Phone"`
	Role     string `json:"Role"`
}

type fallbackSession struct {
	SessionID        string `json:"SessionID"`
	UserID           string `json:"UserID"`
	RefreshTokenHash string `json:"RefreshTokenHash"`
	Revoked          bool   `json:"Revoked"`
	ExpiresAt        string `json:"ExpiresAt"`
}

type fallbackStore struct {
	Accounts map[string]*fallbackAccount `json:"accounts"`
	ByID     map[string]*fallbackAccount `json:"by_id"`
	Sessions map[string]*fallbackSession `json:"sessions"`
}

func tryResolveClaimsFromSession(rawToken string) (*security.TokenClaims, error) {
	hash := security.HashRefreshToken(rawToken)
	store := database.NewPersistentFileStore("auth_accounts.json")
	var data fallbackStore
	if err := store.Load(&data); err != nil {
		return nil, err
	}
	var matchedSession *fallbackSession
	for _, sess := range data.Sessions {
		if sess.RefreshTokenHash == hash && !sess.Revoked {
			matchedSession = sess
			break
		}
	}
	if matchedSession == nil {
		return nil, errors.New("الجلسة غير موجودة")
	}
	acc := data.ByID[matchedSession.UserID]
	if acc == nil {
		return nil, errors.New("الحساب غير موجود")
	}
	return &security.TokenClaims{
		UserID:    acc.ID,
		Phone:     acc.Phone,
		Role:      acc.Role,
		SessionID: matchedSession.SessionID,
	}, nil
}

// RequireAuth يتحقق من صلاحية الـ Access Token أو الـ Refresh Token ويضع بيانات المستخدم والدور في الـ Context
func RequireAuth(moduleName string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(authHeader, "Bearer ") {
			response.ModuleError(w, http.StatusUnauthorized, moduleName, "AUTH_REQUIRED", "يرجى تسجيل الدخول أولاً للمتابعة.")
			return
		}

		rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		claims, err := security.VerifyAccessToken(rawToken)
		if err != nil {
			if sessClaims, sessErr := tryResolveClaimsFromSession(rawToken); sessErr == nil && sessClaims != nil {
				claims = sessClaims
			} else {
				response.ModuleError(w, http.StatusUnauthorized, moduleName, "INVALID_OR_EXPIRED_TOKEN", err.Error())
				return
			}
		}

		ctx := context.WithValue(r.Context(), CtxUserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, CtxUserPhoneKey, claims.Phone)
		ctx = context.WithValue(ctx, CtxUserRoleKey, claims.Role)
		ctx = context.WithValue(ctx, CtxSessionIDKey, claims.SessionID)

		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// RequireRoles يطبق الصلاحيات داخل الـ Backend (البند 11: عدم الاكتفاء بإخفاء الأزرار من الواجهة)
func RequireRoles(moduleName string, allowedRoles []string, next http.HandlerFunc) http.HandlerFunc {
	roleSet := make(map[string]struct{}, len(allowedRoles))
	for _, role := range allowedRoles {
		roleSet[role] = struct{}{}
	}

	return RequireAuth(moduleName, func(w http.ResponseWriter, r *http.Request) {
		userRole := GetUserRole(r.Context())
		if _, ok := roleSet[userRole]; !ok {
			response.ModuleError(
				w,
				http.StatusForbidden,
				moduleName,
				"FORBIDDEN_ROLE",
				"ليس لديك الصلاحية الإدارية لتنفيذ هذا الإجراء.",
			)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(CtxUserIDKey).(string)
	return v
}

func GetUserRole(ctx context.Context) string {
	v, _ := ctx.Value(CtxUserRoleKey).(string)
	return v
}

func GetSessionID(ctx context.Context) string {
	v, _ := ctx.Value(CtxSessionIDKey).(string)
	return v
}

// LoginRateLimiter يحمي مسار تسجيل الدخول من محاولات التخمين (Brute-Force Protection - البند 15)
type LoginRateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	maxCount int
	window   time.Duration
}

func NewLoginRateLimiter(maxCount int, window time.Duration) *LoginRateLimiter {
	return &LoginRateLimiter{
		attempts: make(map[string][]time.Time),
		maxCount: maxCount,
		window:   window,
	}
}

func (rl *LoginRateLimiter) Limit(moduleName string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil || ip == "" {
			ip = r.RemoteAddr
		}

		now := time.Now()
		cutoff := now.Add(-rl.window)

		rl.mu.Lock()
		history := rl.attempts[ip]
		valid := history[:0]
		for _, t := range history {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}

		if len(valid) >= rl.maxCount {
			rl.attempts[ip] = valid
			rl.mu.Unlock()
			response.ModuleError(
				w,
				http.StatusTooManyRequests,
				moduleName,
				"TOO_MANY_LOGIN_ATTEMPTS",
				"تم تجاوز الحد المسموح لمحاولات تسجيل الدخول. يرجى الانتظار دقيقة والمحاولة مرة أخرى.",
			)
			return
		}

		valid = append(valid, now)
		rl.attempts[ip] = valid
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	}
}
