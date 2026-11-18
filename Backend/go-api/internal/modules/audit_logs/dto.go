package audit_logs

import "time"

type AuditLogDTO struct {
	ID        string    `json:"id"`
	Module    string    `json:"module"`
	Action    string    `json:"action"`
	ActorRole string    `json:"actor_role"`
	CreatedAt time.Time `json:"created_at"`
}
