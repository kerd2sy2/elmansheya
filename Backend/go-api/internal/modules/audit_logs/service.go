package audit_logs

import "context"

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) GetLogs(ctx context.Context) ([]AuditLogDTO, error) {
	return s.repo.ListLogs(ctx)
}
