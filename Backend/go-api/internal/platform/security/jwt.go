package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"
)

type TokenClaims struct {
	UserID    string `json:"sub"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`
	SessionID string `json:"sid"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

var jwtSecret = []byte(getSigningSecret())

func getSigningSecret() string {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return s
	}
	return "elmansheya-dev-hmac-secret-key-2026-change-in-prod"
}

// GenerateAccessToken ينشئ Access Token قصير العمر (15 دقيقة) طبقاً للبند 15
func GenerateAccessToken(userID, phone, role, sessionID string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		UserID:    userID,
		Phone:     phone,
		Role:      role,
		SessionID: sessionID,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(ttl).Unix(),
	}

	headerJSON := `{"alg":"HS256","typ":"JWT"}`
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	headerSeg := base64.RawURLEncoding.EncodeToString([]byte(headerJSON))
	payloadSeg := base64.RawURLEncoding.EncodeToString(payloadBytes)
	signingInput := headerSeg + "." + payloadSeg
	sig := signHS256(signingInput)

	return signingInput + "." + sig, nil
}

// VerifyAccessToken يتحقق من صحة وتاريخ صلاحية الـ Access Token
func VerifyAccessToken(token string) (*TokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("صيغة التوكن غير صالحة")
	}

	signingInput := parts[0] + "." + parts[1]
	expectedSig := signHS256(signingInput)
	if !hmac.Equal([]byte(parts[2]), []byte(expectedSig)) {
		return nil, errors.New("توقيع التوكن غير صالح")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	var claims TokenClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, err
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("انتهت صلاحية جلسة الدخول")
	}

	return &claims, nil
}

// GenerateRefreshToken ينشئ Refresh Token عشوائي آمن قابل للتدوير والإلغاء
func GenerateRefreshToken() (rawToken string, tokenHash string, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	rawToken = base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(rawToken))
	tokenHash = hex.EncodeToString(sum[:])
	return rawToken, tokenHash, nil
}

func HashRefreshToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func signHS256(input string) string {
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(input))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
