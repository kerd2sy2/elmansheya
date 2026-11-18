package ratings

import (
	"context"

	"elmansheya/go-api/internal/modules/craftsmen"
)

type Service struct {
	repo          Repository
	craftsmenRepo craftsmen.Repository
}

func NewService(repo Repository, craftsmenRepo craftsmen.Repository) *Service {
	return &Service{
		repo:          repo,
		craftsmenRepo: craftsmenRepo,
	}
}

func (s *Service) GetRatings(ctx context.Context, craftsmanID string) ([]RatingDTO, error) {
	return s.repo.ListRatings(ctx, craftsmanID)
}

func (s *Service) SubmitRating(ctx context.Context, req SubmitRatingRequestDTO) (*RatingDTO, error) {
	dto, err := s.repo.SubmitRating(ctx, req)
	if err != nil {
		return nil, err
	}
	if s.craftsmenRepo != nil && req.CraftsmanID != "" {
		_ = s.craftsmenRepo.AddRating(ctx, req.CraftsmanID, req.Stars)
	}
	return dto, nil
}
