package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
)

const (
	saltSize   = 16
	iterations = 15000
)

// HashPassword يقوم بتشفير كلمة المرور باستخدام Salt عشوائي و15,000 دورة HMAC-SHA256
func HashPassword(plain string) (string, error) {
	if len(plain) < 4 {
		return "", errors.New("كلمة المرور يجب ألا تقل عن 4 أحرف")
	}
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	dk := deriveKey([]byte(plain), salt, iterations)
	return fmt.Sprintf("pbkdf2_sha256$%d$%s$%s",
		iterations,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(dk),
	), nil
}

// VerifyPassword يتحقق من كلمة المرور بزمن ثابت (Constant-Time) لمنع هجمات التوقيت
func VerifyPassword(plain, encodedHash string) bool {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 4 || parts[0] != "pbkdf2_sha256" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}
	actual := deriveKey([]byte(plain), salt, iterations)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func deriveKey(password, salt []byte, iter int) []byte {
	mac := hmac.New(sha256.New, password)
	mac.Write(salt)
	u := mac.Sum(nil)
	out := make([]byte, len(u))
	copy(out, u)

	for i := 1; i < iter; i++ {
		mac.Reset()
		mac.Write(u)
		u = mac.Sum(nil)
		for j := range out {
			out[j] ^= u[j]
		}
	}
	return out
}
