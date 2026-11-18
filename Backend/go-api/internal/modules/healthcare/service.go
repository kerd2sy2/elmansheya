package healthcare

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetEntities(ctx context.Context) ([]MedicalEntityDTO, error) {
	return s.repo.ListMedicalEntities(ctx)
}
