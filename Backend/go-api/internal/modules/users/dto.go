package users

import "time"

type UserProfileDTO struct {
	ID                 string    `json:"id"`
	FullName           string    `json:"full_name"`
	Phone              string    `json:"phone"`
	AvatarURL          string    `json:"avatar_url,omitempty"`
	Area               string    `json:"area"`
	VerificationStatus string    `json:"verification_status"`
	VerificationLabel  string    `json:"verification_label"`
	BiometricEnabled   bool      `json:"biometric_enabled"`
	ReportsCount       int       `json:"reports_count"`
	RatingsCount       int       `json:"ratings_count"`
	RegisteredAt       time.Time `json:"registered_at"`
}
