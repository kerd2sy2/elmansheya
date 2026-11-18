package users

import (
	"context"
	"time"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context) (*UserProfileDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	return s.repo.GetMyProfile(qCtx)
}
