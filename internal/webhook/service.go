package webhook

import (
	"context"
	"errors"
	"fmt"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type service struct {
	db *gorm.DB
}

// NewService creates a new webhooks service.
func NewService(db *gorm.DB) Service {
	return &service{db: db}
}

func (s *service) CreateWebhook(ctx context.Context, tenantID, url, secret string, events []string) (string, error) {
	var id string
	err := s.db.WithContext(ctx).Raw(`INSERT INTO webhooks (tenant_id, url, secret, events, active) 
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		tenantID, url, secret, pq.Array(events), true).Scan(&id).Error
	if err != nil {
		return "", fmt.Errorf("create webhook: %w", err)
	}
	return id, nil
}

func (s *service) GetWebhook(ctx context.Context, tenantID, id string) (*Webhook, error) {
	var w Webhook
	err := s.db.WithContext(ctx).Raw(`SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2`, id, tenantID).Scan(&w).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get webhook: %w", err)
	}
	return &w, nil
}

func (s *service) ListWebhooks(ctx context.Context, tenantID string) ([]Webhook, error) {
	var webhooks []Webhook
	err := s.db.WithContext(ctx).Raw(`SELECT * FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID).Scan(&webhooks).Error
	if err != nil {
		return nil, fmt.Errorf("list webhooks: %w", err)
	}
	return webhooks, nil
}

func (s *service) DeleteWebhook(ctx context.Context, tenantID, id string) error {
	err := s.db.WithContext(ctx).Exec(`DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2`, id, tenantID).Error
	if err != nil {
		return fmt.Errorf("delete webhook: %w", err)
	}
	return nil
}

func (s *service) GetWebhooksForEvent(ctx context.Context, tenantID, event string) ([]Webhook, error) {
	var webhooks []Webhook
	err := s.db.WithContext(ctx).Raw(
		`SELECT * FROM webhooks WHERE tenant_id = $1 AND active = true AND $2 = ANY(events)`,
		tenantID, event).Scan(&webhooks).Error
	if err != nil {
		return nil, fmt.Errorf("get webhooks for event: %w", err)
	}
	return webhooks, nil
}
