package audit_logs

import (
	"context"
	"time"
)

type Repository interface {
	ListLogs(ctx context.Context) ([]AuditLogDTO, error)
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListLogs(ctx context.Context) ([]AuditLogDTO, error) {
	return []AuditLogDTO{
		{
			ID:        "aud-1",
			Module:    "system",
			Action:    "INITIALIZE_MODULAR_MONOLITH",
			ActorRole: "system_admin",
			CreatedAt: time.Now(),
		},
	}, nil
}
