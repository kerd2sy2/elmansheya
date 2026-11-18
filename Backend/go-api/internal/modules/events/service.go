package events

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetEvents(ctx context.Context) ([]EventDTO, error) {
	return s.repo.ListEvents(ctx)
}
