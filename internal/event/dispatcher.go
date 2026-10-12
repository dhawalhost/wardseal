package event

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/internal/webhook"
)

// Event represents a system event.
type Event struct {
	ID        string      `json:"id"`
	TenantID  string      `json:"tenant_id"`
	Type      string      `json:"type"` // e.g. "user.created"
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

// Dispatcher handles event publication into a durable webhook outbox.
type Dispatcher struct {
	webhookSvc webhook.Service
	outbox     webhook.OutboxStore
	logger     *zap.Logger
	httpClient *http.Client

	workerOnce sync.Once
	stopCh     chan struct{}
}

var privateIPBlocks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"0.0.0.0/8",
		"127.0.0.0/8",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16",
		"100.64.0.0/10",
		"198.18.0.0/15",
		"::/128",
		"::1/128",
		"fe80::/10",
		"fc00::/7",
	} {
		_, block, err := net.ParseCIDR(cidr)
		if err == nil {
			privateIPBlocks = append(privateIPBlocks, block)
		}
	}
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

// resolvePublicIP looks up host and rejects if any resolved address is private (DNS rebinding).
func resolvePublicIP(ctx context.Context, host string) (net.IP, error) {
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("no IP addresses found for host: %s", host)
	}
	var chosen net.IP
	for _, addr := range ips {
		ip := addr.IP
		if isPrivateIP(ip) {
			return nil, fmt.Errorf("connection to private IP address rejected: %s", ip)
		}
		if chosen == nil {
			chosen = ip
		}
	}
	return chosen, nil
}

// NewDispatcher creates a new event dispatcher with SSRF-safe dialing and optional outbox.
func NewDispatcher(webhookSvc webhook.Service, outbox webhook.OutboxStore, logger *zap.Logger) *Dispatcher {
	safeDialContext := func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}
		ip, err := resolvePublicIP(ctx, host)
		if err != nil {
			return nil, err
		}
		dialer := &net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}
		return dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
	}

	return &Dispatcher{
		webhookSvc: webhookSvc,
		outbox:     outbox,
		logger:     logger,
		stopCh:     make(chan struct{}),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				DialContext:         safeDialContext,
				DisableKeepAlives:   true,
				MaxIdleConnsPerHost: 0,
			},
			// Do not follow redirects — prevents SSRF via 30x to private IPs.
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// Publish enqueues webhook deliveries durably (or best-effort sync if outbox is nil).
func (d *Dispatcher) Publish(ctx context.Context, event Event) {
	hooks, err := d.webhookSvc.GetWebhooksForEvent(ctx, event.TenantID, event.Type)
	if err != nil {
		d.logger.Error("Failed to fetch webhooks for event", zap.Error(err))
		return
	}
	if len(hooks) == 0 {
		return
	}

	payloadBytes, err := json.Marshal(event)
	if err != nil {
		d.logger.Error("Failed to marshal event payload", zap.Error(err))
		return
	}

	for _, hook := range hooks {
		if d.outbox != nil {
			if err := d.outbox.Enqueue(ctx, event.TenantID, hook.ID, event.ID, event.Type, payloadBytes); err != nil {
				d.logger.Error("Failed to enqueue webhook delivery",
					zap.String("webhook_id", hook.ID),
					zap.Error(err))
			}
			continue
		}
		// Fallback without outbox (tests / local): still send via safe client.
		go d.deliver(context.WithoutCancel(ctx), hook.URL, hook.Secret, payloadBytes, event.ID)
	}
}

// StartWorker begins polling the outbox. Safe to call once.
func (d *Dispatcher) StartWorker(ctx context.Context, interval time.Duration) {
	if d.outbox == nil {
		return
	}
	if interval <= 0 {
		interval = 5 * time.Second
	}
	d.workerOnce.Do(func() {
		go d.runWorker(ctx, interval)
	})
}

// Stop signals the outbox worker to exit.
func (d *Dispatcher) Stop() {
	select {
	case <-d.stopCh:
	default:
		close(d.stopCh)
	}
}

func (d *Dispatcher) runWorker(ctx context.Context, interval time.Duration) {
	d.logger.Info("Webhook outbox worker started", zap.Duration("interval", interval))
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-d.stopCh:
			return
		case <-ticker.C:
			d.drainOnce(ctx)
		}
	}
}

func (d *Dispatcher) drainOnce(ctx context.Context) {
	rows, err := d.outbox.ClaimDue(ctx, 32)
	if err != nil {
		d.logger.Error("Failed to claim webhook deliveries", zap.Error(err))
		return
	}
	for _, row := range rows {
		// Re-resolve at delivery time to reduce DNS rebinding TOCTOU window.
		if err := d.deliverRaw(ctx, row.URL, row.Secret, row.Payload, row.EventID); err != nil {
			attempts := row.Attempts + 1
			_ = d.outbox.MarkFailed(ctx, row.ID, attempts, row.MaxAttempts, err.Error())
			d.logger.Warn("Webhook delivery failed",
				zap.String("delivery_id", row.ID),
				zap.String("url", row.URL),
				zap.Int("attempts", attempts),
				zap.Error(err))
			continue
		}
		_ = d.outbox.MarkDelivered(ctx, row.ID)
		d.logger.Info("Webhook delivered", zap.String("delivery_id", row.ID), zap.String("url", row.URL))
	}
}

func (d *Dispatcher) deliver(ctx context.Context, url, secret string, payload []byte, eventID string) {
	if err := d.deliverRaw(ctx, url, secret, payload, eventID); err != nil {
		d.logger.Error("Webhook delivery failed", zap.String("url", url), zap.Error(err))
	}
}

func (d *Dispatcher) deliverRaw(ctx context.Context, url, secret string, payload []byte, eventID string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-WardSeal-Event-ID", eventID)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	req.Header.Set("X-WardSeal-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer func() { _, _ = io.Copy(io.Discard, resp.Body); _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("non-2xx response: %d", resp.StatusCode)
	}
	return nil
}
