package notifications

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetChannels(ctx context.Context) []NotificationChannelDTO {
	return s.repo.ListChannels(ctx)
}
