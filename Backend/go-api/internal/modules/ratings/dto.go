package ratings

import "time"

type RatingDTO struct {
	ID                string    `json:"id"`
	CraftsmanID       string    `json:"craftsman_id"`
	CraftsmanName     string    `json:"craftsman_name"`
	Stars             int       `json:"stars"`
	Comment           string    `json:"comment"`
	UserName          string    `json:"user_name"`
	UserPhone         string    `json:"user_phone"`
	DeviceFingerprint string    `json:"device_fingerprint"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type SubmitRatingRequestDTO struct {
	CraftsmanID       string `json:"craftsman_id"`
	Stars             int    `json:"stars"`
	Comment           string `json:"comment"`
	UserName          string `json:"user_name"`
	UserPhone         string `json:"user_phone"`
	DeviceFingerprint string `json:"device_fingerprint"`
}
