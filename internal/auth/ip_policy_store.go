package auth

import (
	"context"
	"net"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IPPolicyType defines whether a policy is an ALLOW or BLOCK rule.
type IPPolicyType string

const (
	IPPolicyBlock IPPolicyType = "BLOCK"
	IPPolicyAllow IPPolicyType = "ALLOW"
)

// IPPolicy represents a tenant-scoped IP access control entry.
type IPPolicy struct {
	ID        string       `db:"id"         json:"id"`
	TenantID  string       `db:"tenant_id"  json:"tenant_id"`
	Type      IPPolicyType `db:"type"       json:"type"`
	CIDR      *string      `db:"cidr"       json:"cidr,omitempty"`    // e.g. "192.168.0.0/16"
	Country   *string      `db:"country"    json:"country,omitempty"` // ISO 3166-1 alpha-2
	Reason    string       `db:"reason"     json:"reason,omitempty"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
}

// IPPolicyRepository defines storage operations for IP access policies.
type IPPolicyRepository interface {
	Create(ctx context.Context, p IPPolicy) (string, error)
	List(ctx context.Context, tenantID string) ([]IPPolicy, error)
	Delete(ctx context.Context, tenantID, id string) error
	// ListBlocked returns only BLOCK entries for a tenant — used by the risk engine.
	ListBlocked(ctx context.Context, tenantID string) ([]IPPolicy, error)
}

// EvaluateIP checks whether a given IP address is blocked by any of the provided policies.
// Returns true (and the matching policy) if the IP is blocked.
func EvaluateIP(ip string, policies []IPPolicy) (blocked bool, policy *IPPolicy) {
	parsed := net.ParseIP(ip)
	for i, p := range policies {
		if p.Type != IPPolicyBlock {
			continue
		}
		if p.CIDR != nil && *p.CIDR != "" && parsed != nil {
			_, cidr, err := net.ParseCIDR(*p.CIDR)
			if err == nil && cidr.Contains(parsed) {
				return true, &policies[i]
			}
		}
	}
	return false, nil
}

// sqlIPPolicyRepository implements IPPolicyRepository backed by PostgreSQL.
type sqlIPPolicyRepository struct {
	db *gorm.DB
}

// NewIPPolicyRepository creates a SQL-backed IPPolicyRepository.
func NewIPPolicyRepository(db *gorm.DB) IPPolicyRepository {
	return &sqlIPPolicyRepository{db: db}
}

func (r *sqlIPPolicyRepository) Create(ctx context.Context, p IPPolicy) (string, error) {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()
	err := r.db.WithContext(ctx).Exec(`
		INSERT INTO ip_policy (id, tenant_id, type, cidr, country, reason, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, p.ID, p.TenantID, p.Type, p.CIDR, p.Country, p.Reason, p.CreatedAt).Error
	return p.ID, err
}

func (r *sqlIPPolicyRepository) List(ctx context.Context, tenantID string) ([]IPPolicy, error) {
	var policies []IPPolicy
	err := r.db.WithContext(ctx).Raw(`SELECT * FROM ip_policy WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID).Scan(&policies).Error
	return policies, err
}

func (r *sqlIPPolicyRepository) Delete(ctx context.Context, tenantID, id string) error {
	err := r.db.WithContext(ctx).Exec(`DELETE FROM ip_policy WHERE id = ? AND tenant_id = ?`, id, tenantID).Error
	return err
}

func (r *sqlIPPolicyRepository) ListBlocked(ctx context.Context, tenantID string) ([]IPPolicy, error) {
	var policies []IPPolicy
	err := r.db.WithContext(ctx).Raw(`SELECT * FROM ip_policy WHERE tenant_id = $1 AND type = 'BLOCK' ORDER BY created_at DESC`, tenantID).Scan(&policies).Error
	return policies, err
}
