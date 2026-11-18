package services

import (
	"context"
	"errors"
	"strings"
	"time"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetMainCategories(ctx context.Context) ([]ServiceCategoryDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	return s.repo.ListMainCategories(qCtx)
}

func (s *Service) GetCategoryItems(ctx context.Context, slug string) ([]ServiceItemDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	return s.repo.ListItemsByCategory(qCtx, slug)
}

func (s *Service) AddServiceItem(ctx context.Context, req CreateServiceItemRequestDTO) (*ServiceItemDTO, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.CategorySlug) == "" {
		return nil, errors.New("عنوان الخدمة وتصنيفها مطلوبان")
	}
	return s.repo.CreateServiceItem(ctx, req)
}
