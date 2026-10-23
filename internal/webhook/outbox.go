package webhook

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// Delivery is one durable webhook send attempt row.
type Delivery struct {
	ID            string          `db:"id"`
	TenantID      string          `db:"tenant_id"`
	WebhookID     string          `db:"webhook_id"`
	EventID       string          `db:"event_id"`
	EventType     string          `db:"event_type"`
	Payload       json.RawMessage `db:"payload"`
	Status        string          `db:"status"`
	Attempts      int             `db:"attempts"`
	MaxAttempts   int             `db:"max_attempts"`
	NextAttemptAt time.Time       `db:"next_attempt_at"`
	LastError     sql.NullString  `db:"last_error"`
	URL           string          `db:"url"`
	Secret        string          `db:"secret"`
}

// OutboxStore persists webhook deliveries for retry / DLQ.
type OutboxStore interface {
	Enqueue(ctx context.Context, tenantID, webhookID, eventID, eventType string, payload []byte) error
	ClaimDue(ctx context.Context, limit int) ([]Delivery, error)
	MarkDelivered(ctx context.Context, id string) error
	MarkFailed(ctx context.Context, id string, attempts, maxAttempts int, errMsg string) error
}

type sqlOutboxStore struct {
	db *sqlx.DB
}

// NewOutboxStore creates a SQL-backed outbox.
func NewOutboxStore(db *sqlx.DB) OutboxStore {
	return &sqlOutboxStore{db: db}
}

func (s *sqlOutboxStore) Enqueue(ctx context.Context, tenantID, webhookID, eventID, eventType string, payload []byte) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO webhook_deliveries (tenant_id, webhook_id, event_id, event_type, payload)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		tenantID, webhookID, eventID, eventType, string(payload))
	if err != nil {
		return fmt.Errorf("enqueue webhook delivery: %w", err)
	}
	return nil
}

func (s *sqlOutboxStore) ClaimDue(ctx context.Context, limit int) ([]Delivery, error) {
	if limit <= 0 {
		limit = 32
	}
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []Delivery
	err = tx.SelectContext(ctx, &rows, `
		SELECT d.id, d.tenant_id, d.webhook_id, d.event_id, d.event_type, d.payload,
		       d.status, d.attempts, d.max_attempts, d.next_attempt_at, d.last_error,
		       w.url, w.secret
		FROM webhook_deliveries d
		JOIN webhooks w ON w.id = d.webhook_id AND w.tenant_id = d.tenant_id
		WHERE d.status IN ('pending', 'delivering')
		  AND d.next_attempt_at <= NOW()
		  AND w.active = true
		ORDER BY d.next_attempt_at ASC
		LIMIT $1
		FOR UPDATE OF d SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim webhook deliveries: %w", err)
	}

	for _, row := range rows {
		if _, err := tx.ExecContext(ctx, `
			UPDATE webhook_deliveries
			SET status = 'delivering', updated_at = NOW()
			WHERE id = $1`, row.ID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *sqlOutboxStore) MarkDelivered(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries
		SET status = 'delivered', delivered_at = NOW(), updated_at = NOW(), last_error = NULL
		WHERE id = $1`, id)
	return err
}

func (s *sqlOutboxStore) MarkFailed(ctx context.Context, id string, attempts, maxAttempts int, errMsg string) error {
	nextStatus := "pending"
	shift := attempts
	if shift > 6 {
		shift = 6
	}
	backoff := time.Duration(1<<shift) * time.Second
	if attempts >= maxAttempts {
		nextStatus = "dead"
		backoff = 0
	}
	nextAt := time.Now().Add(backoff)
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries
		SET status = $2, attempts = $3, next_attempt_at = $4, last_error = $5, updated_at = NOW()
		WHERE id = $1`, id, nextStatus, attempts, nextAt, errMsg)
	return err
}
