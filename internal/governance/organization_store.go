package governance

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// Organization represents an enterprise customer of a tenant.
type Organization struct {
	ID                          string          `gorm:"primaryKey;column:id" json:"id"`
	TenantID                    string          `gorm:"column:tenant_id" json:"tenant_id"`
	Name                        string          `gorm:"column:name" json:"name"`
	DisplayName                 *string         `gorm:"column:display_name" json:"display_name,omitempty"`
	Domain                      *string         `gorm:"column:domain" json:"domain,omitempty"`
	DomainVerified              bool            `gorm:"column:domain_verified" json:"domain_verified"`
	DomainVerificationToken     *string         `gorm:"column:domain_verification_token" json:"-"`
	DomainVerificationExpiresAt *time.Time      `gorm:"column:domain_verification_expires_at" json:"-"`
	Metadata                    json.RawMessage `gorm:"column:metadata;type:jsonb" json:"metadata"`
	Settings                    json.RawMessage `gorm:"column:settings;type:jsonb" json:"settings"`
	CreatedAt                   time.Time       `gorm:"column:created_at" json:"created_at"`
	UpdatedAt                   time.Time       `gorm:"column:updated_at" json:"updated_at"`
}

func (Organization) TableName() string {
	return "organizations"
}

// OrganizationRepository defines the interface for organization storage.
type OrganizationRepository interface {
	Create(ctx context.Context, org *Organization) error
	Get(ctx context.Context, tenantID, orgID string) (*Organization, error)
	GetByName(ctx context.Context, tenantID, name string) (*Organization, error)
	List(ctx context.Context, tenantID string, limit, offset int) ([]Organization, error)
	Update(ctx context.Context, org *Organization) error
	Delete(ctx context.Context, tenantID, orgID string) error
}

type sqlOrganizationRepository struct {
	db *gorm.DB
}

// NewOrganizationRepository creates a new organization repository.
func NewOrganizationRepository(db *gorm.DB) OrganizationRepository {
	return &sqlOrganizationRepository{db: db}
}

func (r *sqlOrganizationRepository) Create(ctx context.Context, org *Organization) error {
	if org.Metadata == nil {
		org.Metadata = json.RawMessage("{}")
	}
	if org.Settings == nil {
		org.Settings = json.RawMessage("{}")
	}
	return r.db.WithContext(ctx).Create(org).Error
}

func (r *sqlOrganizationRepository) Get(ctx context.Context, tenantID, orgID string) (*Organization, error) {
	var org Organization
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, orgID).First(&org).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // API expects nil if not found
		}
		return nil, err
	}
	return &org, nil
}

func (r *sqlOrganizationRepository) GetByName(ctx context.Context, tenantID, name string) (*Organization, error) {
	var org Organization
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND name = ?", tenantID, name).First(&org).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // API expects nil if not found
		}
		return nil, err
	}
	return &org, nil
}

func (r *sqlOrganizationRepository) List(ctx context.Context, tenantID string, limit, offset int) ([]Organization, error) {
	if limit <= 0 {
		limit = 50
	}
	var orgs []Organization
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("name ASC").Limit(limit).Offset(offset).Find(&orgs).Error; err != nil {
		return nil, err
	}
	return orgs, nil
}

func (r *sqlOrganizationRepository) Update(ctx context.Context, org *Organization) error {
	// Let GORM update all non-zero fields, but specifically update the ones from the old query.
	// Since org has its ID, Save/Updates will work.
	return r.db.WithContext(ctx).Model(org).
		Where("tenant_id = ? AND id = ?", org.TenantID, org.ID).
		Updates(map[string]interface{}{
			"name":            org.Name,
			"display_name":    org.DisplayName,
			"domain":          org.Domain,
			"domain_verified": org.DomainVerified,
			"metadata":        org.Metadata,
			"settings":        org.Settings,
			"updated_at":      gorm.Expr("NOW()"),
		}).Error
}

func (r *sqlOrganizationRepository) Delete(ctx context.Context, tenantID, orgID string) error {
	return r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, orgID).Delete(&Organization{}).Error
}
