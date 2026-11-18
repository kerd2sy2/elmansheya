package auth

import "time"

type LoginRequestDTO struct {
	Phone             string `json:"phone"`
	Password          string `json:"password"`
	DeviceName        string `json:"device_name"`
	DeviceFingerprint string `json:"device_fingerprint"`
	EnableBiometric   bool   `json:"enable_biometric"`
}

type RegisterRequestDTO struct {
	FullName          string `json:"full_name"`
	Phone             string `json:"phone"`
	Password          string `json:"password"`
	Area              string `json:"area"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

type RefreshRequestDTO struct {
	RefreshToken string `json:"refresh_token"`
}

type BiometricLoginRequestDTO struct {
	Phone             string `json:"phone"`
	RefreshToken      string `json:"refresh_token"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

type ChangePasswordRequestDTO struct {
	Phone       string `json:"phone"`
	NewPassword string `json:"new_password"`
}

type AuthUserDTO struct {
	ID                     string `json:"id"`
	FullName               string `json:"full_name"`
	Phone                  string `json:"phone"`
	Area                   string `json:"area"`
	Role                   string `json:"role"`
	RoleNameAr             string `json:"role_name_ar"`
	VerificationStatus     string `json:"verification_status"`
	BiometricEnabled       bool   `json:"biometric_enabled"`
	BoundDeviceFingerprint string `json:"bound_device_fingerprint"`
}

type AuthTokensResponseDTO struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresInSec int         `json:"expires_in_sec"`
	SessionID    string      `json:"session_id"`
	User         AuthUserDTO `json:"user"`
}

type StoredAccount struct {
	ID                     string
	FullName               string
	Phone                  string
	PasswordHash           string
	Area                   string
	Role                   string
	RoleNameAr             string
	VerificationStatus     string
	BiometricEnabled       bool
	BoundDeviceFingerprint string
	CreatedAt              time.Time
}

type StoredSession struct {
	SessionID        string
	UserID           string
	RefreshTokenHash string
	BiometricBound   bool
	Revoked          bool
	ExpiresAt        time.Time
}
