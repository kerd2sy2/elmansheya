package humanitarian

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetCases(ctx context.Context) ([]HumanitarianCaseDTO, error) {
	return s.repo.ListCases(ctx)
}
