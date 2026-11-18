package craftsmen

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

func (s *Service) GetDirectory(ctx context.Context) ([]CategoryDTO, []CraftsmanCardDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	cats, err := s.repo.ListCategories(qCtx)
	if err != nil {
		return nil, nil, err
	}
	list, err := s.repo.SearchCraftsmen(qCtx)
	if err != nil {
		return nil, nil, err
	}
	return cats, list, nil
}

func (s *Service) AddCraftsman(ctx context.Context, req CreateCraftsmanRequestDTO) (*CraftsmanCardDTO, error) {
	if strings.TrimSpace(req.FullName) == "" || strings.TrimSpace(req.Phone) == "" || strings.TrimSpace(req.Specialty) == "" {
		return nil, errors.New("الاسم والتخصص ورقم الهاتف مطلوبون")
	}
	return s.repo.CreateCraftsman(ctx, req)
}
