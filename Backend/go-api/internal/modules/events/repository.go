package events

import "context"

type Repository interface {
	ListEvents(ctx context.Context) ([]EventDTO, error)
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListEvents(ctx context.Context) ([]EventDTO, error) {
	return []EventDTO{
		{
			ID:           "ev-1",
			Title:        "قافلة طبية مجانية شاملة لأهالي المنشية",
			EventType:    "فعالية صحية",
			EventDate:    "2026-11-15",
			EventTime:    "10:00 صباحاً - 04:00 عصراً",
			LocationName: "مقر الجمعية الخيرية بالمنشية",
		},
	}, nil
}
