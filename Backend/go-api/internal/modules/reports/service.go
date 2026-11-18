package reports

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

func (s *Service) GetOverview(ctx context.Context) ([]ReportTypeDTO, []PublicReportDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	types := s.repo.ListReportTypes(qCtx)
	publicList, err := s.repo.ListPublicReports(qCtx)
	if err != nil {
		return nil, nil, err
	}
	return types, publicList, nil
}

func (s *Service) GetUserReports(ctx context.Context, userID, userPhone string) ([]PublicReportDTO, error) {
	qCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	return s.repo.ListUserReports(qCtx, userID, userPhone)
}

func (s *Service) SubmitReport(ctx context.Context, req CreateReportRequestDTO) (*PublicReportDTO, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.ManualAddress) == "" {
		return nil, errors.New("عنوان البلاغ والعنوان اليدوي مطلوبان")
	}
	return s.repo.CreateReport(ctx, req)
}
