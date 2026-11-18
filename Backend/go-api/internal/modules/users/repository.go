package users

import (
	"context"
	"time"
)

type Repository interface {
	GetMyProfile(ctx context.Context) (*UserProfileDTO, error)
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) GetMyProfile(ctx context.Context) (*UserProfileDTO, error) {
	return &UserProfileDTO{
		ID:                 "usr-1",
		FullName:           "مواطن قرية المنشية",
		Phone:              "01012345678",
		Area:               "المنشية - وسط البلد",
		VerificationStatus: "unverified",
		VerificationLabel:  "غير موثق",
		BiometricEnabled:   true,
		ReportsCount:       2,
		RatingsCount:       5,
		RegisteredAt:       time.Now().AddDate(0, -2, 0),
	}, nil
}
