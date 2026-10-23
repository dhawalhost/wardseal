package event

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/eventbus"
)

// topicToWebhookEvent maps internal bus topics to customer-facing webhook types.
var topicToWebhookEvent = map[string]string{
	"UserCreated":            "user.created",
	"UserDeactivated":        "user.deactivated",
	"GroupMembershipChanged": "group.membership_changed",
	"ProposedRevocation":     "access.proposed_revocation",
}

// RegisterWebhookBridge subscribes the dispatcher to EventBus topics.
func RegisterWebhookBridge(ctx context.Context, bus eventbus.EventBus, d *Dispatcher, log *zap.Logger) error {
	if bus == nil || d == nil {
		return nil
	}
	for topic, eventType := range topicToWebhookEvent {
		t := topic
		et := eventType
		if err := bus.Subscribe(ctx, t, func(ctx context.Context, payload []byte) error {
			tenantID := extractTenantID(payload)
			if tenantID == "" {
				log.Warn("webhook bridge skipped event without tenant_id", zap.String("topic", t))
				return nil
			}
			var body interface{}
			_ = json.Unmarshal(payload, &body)
			d.Publish(ctx, Event{
				ID:        uuid.NewString(),
				TenantID:  tenantID,
				Type:      et,
				Payload:   body,
				Timestamp: time.Now().UTC(),
			})
			return nil
		}); err != nil {
			return err
		}
		log.Info("Webhook bridge subscribed", zap.String("topic", t), zap.String("event_type", et))
	}
	return nil
}

func extractTenantID(payload []byte) string {
	var m map[string]interface{}
	if err := json.Unmarshal(payload, &m); err != nil {
		return ""
	}
	if v, ok := m["tenant_id"].(string); ok {
		return v
	}
	return ""
}
