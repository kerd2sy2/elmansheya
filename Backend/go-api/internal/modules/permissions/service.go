package permissions

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetRoles(ctx context.Context) []RoleDTO {
	return s.repo.ListRoles(ctx)
}
