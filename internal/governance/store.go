package governance

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

// Repository defines database operations for governance.
type Repository interface {
	CreateRequest(ctx context.Context, req AccessRequest) (string, error)
	GetRequest(ctx context.Context, tenantID, id string) (AccessRequest, error)
	ListRequests(ctx context.Context, tenantID, status string) ([]AccessRequest, error)
	UpdateRequestStatus(ctx context.Context, id, status string) error

	// IP Access Policies
	CreateIPPolicy(ctx context.Context, p IPPolicy) (string, error)
	ListIPPolicies(ctx context.Context, tenantID string) ([]IPPolicy, error)
	DeleteIPPolicy(ctx context.Context, tenantID, id string) error
}

type sqlRepository struct {
	db *gorm.DB
}

// NewRepository creates a new governance repository.
func NewRepository(db *gorm.DB) Repository {
	return &sqlRepository{db: db}
}

// dbAccessRequest maps to the access_requests table.
type dbAccessRequest struct {
	ID           string    `gorm:"primaryKey;column:id"`
	TenantID     string    `gorm:"column:tenant_id"`
	RequesterID  string    `gorm:"column:requester_id"`
	ResourceType string    `gorm:"column:resource_type"`
	ResourceID   string    `gorm:"column:resource_id"`
	Status       string    `gorm:"column:status"`
	Reason       string    `gorm:"column:reason"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
}

func (dbAccessRequest) TableName() string {
	return "access_requests"
}

func toAccessRequest(dbReq dbAccessRequest) AccessRequest {
	return AccessRequest{
		ID:           dbReq.ID,
		TenantID:     dbReq.TenantID,
		RequesterID:  dbReq.RequesterID,
		ResourceType: dbReq.ResourceType,
		ResourceID:   dbReq.ResourceID,
		Status:       dbReq.Status,
		Reason:       dbReq.Reason,
		CreatedAt:    dbReq.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    dbReq.UpdatedAt.Format(time.RFC3339),
	}
}

func (s *sqlRepository) CreateRequest(ctx context.Context, req AccessRequest) (string, error) {
	dbReq := dbAccessRequest{
		TenantID:     req.TenantID,
		RequesterID:  req.RequesterID,
		ResourceType: req.ResourceType,
		ResourceID:   req.ResourceID,
		Reason:       req.Reason,
		Status:       "pending",
	}

	if err := s.db.WithContext(ctx).Omit("ID").Create(&dbReq).Error; err != nil {
		return "", err
	}
	return dbReq.ID, nil
}

func (s *sqlRepository) GetRequest(ctx context.Context, tenantID, id string) (AccessRequest, error) {
	var dbReq dbAccessRequest
	if err := s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&dbReq).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return AccessRequest{}, errors.New("request not found")
		}
		return AccessRequest{}, err
	}
	return toAccessRequest(dbReq), nil
}

func (s *sqlRepository) ListRequests(ctx context.Context, tenantID, status string) ([]AccessRequest, error) {
	var dbReqs []dbAccessRequest
	query := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&dbReqs).Error; err != nil {
		return nil, err
	}

	requests := make([]AccessRequest, 0, len(dbReqs))
	for _, dr := range dbReqs {
		requests = append(requests, toAccessRequest(dr))
	}
	return requests, nil
}

func (s *sqlRepository) UpdateRequestStatus(ctx context.Context, id, status string) error {
	return s.db.WithContext(ctx).Model(&dbAccessRequest{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": status, "updated_at": gorm.Expr("NOW()")}).Error
}

// dbIPPolicy maps to the ip_policy table.
type dbIPPolicy struct {
	ID          string    `gorm:"primaryKey;column:id"`
	TenantID    string    `gorm:"column:tenant_id"`
	Type        string    `gorm:"column:type"`
	CIDR        string    `gorm:"column:cidr"`
	CountryCode string    `gorm:"column:country"` // Note: table uses 'country'
	Reason      string    `gorm:"column:reason"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (dbIPPolicy) TableName() string {
	return "ip_policy"
}

func toIPPolicy(dbPol dbIPPolicy) IPPolicy {
	return IPPolicy{
		ID:          dbPol.ID,
		TenantID:    dbPol.TenantID,
		Type:        dbPol.Type,
		CIDR:        dbPol.CIDR,
		CountryCode: dbPol.CountryCode,
		Reason:      dbPol.Reason,
		CreatedAt:   dbPol.CreatedAt.Format(time.RFC3339),
	}
}

func (s *sqlRepository) CreateIPPolicy(ctx context.Context, p IPPolicy) (string, error) {
	dbPol := dbIPPolicy{
		ID:          p.ID,
		TenantID:    p.TenantID,
		Type:        p.Type,
		CIDR:        p.CIDR,
		CountryCode: p.CountryCode,
		Reason:      p.Reason,
	}

	if err := s.db.WithContext(ctx).Create(&dbPol).Error; err != nil {
		return "", err
	}
	return p.ID, nil
}

func (s *sqlRepository) ListIPPolicies(ctx context.Context, tenantID string) ([]IPPolicy, error) {
	var dbPols []dbIPPolicy
	if err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC").Find(&dbPols).Error; err != nil {
		return nil, err
	}

	policies := make([]IPPolicy, 0, len(dbPols))
	for _, dp := range dbPols {
		policies = append(policies, toIPPolicy(dp))
	}
	return policies, nil
}

func (s *sqlRepository) DeleteIPPolicy(ctx context.Context, tenantID, id string) error {
	return s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&dbIPPolicy{}).Error
}
