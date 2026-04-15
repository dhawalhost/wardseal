package governance

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Campaign represents a certification campaign.
type Campaign struct {
	ID          string     `gorm:"primaryKey;column:id" json:"id"`
	TenantID    string     `gorm:"column:tenant_id" json:"tenant_id"`
	Name        string     `gorm:"column:name" json:"name"`
	Description string     `gorm:"column:description" json:"description,omitempty"`
	Status      string     `gorm:"column:status" json:"status"` // draft, active, completed, cancelled
	ReviewerID  string     `gorm:"column:reviewer_id" json:"reviewer_id"`
	StartDate   *time.Time `gorm:"column:start_date" json:"start_date,omitempty"`
	EndDate     *time.Time `gorm:"column:end_date" json:"end_date,omitempty"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updated_at"`
}

func (Campaign) TableName() string {
	return "certification_campaigns"
}

// CertificationItem represents an item to be reviewed in a campaign.
type CertificationItem struct {
	ID              string     `gorm:"primaryKey;column:id" json:"id"`
	CampaignID      string     `gorm:"column:campaign_id" json:"campaign_id"`
	TenantID        string     `gorm:"column:tenant_id" json:"tenant_id"`
	UserID          string     `gorm:"column:user_id" json:"user_id"`
	ResourceType    string     `gorm:"column:resource_type" json:"resource_type"`
	ResourceID      string     `gorm:"column:resource_id" json:"resource_id"`
	ResourceName    string     `gorm:"column:resource_name" json:"resource_name,omitempty"`
	Decision        *string    `gorm:"column:decision" json:"decision,omitempty"` // approve, revoke, nil
	DecisionAt      *time.Time `gorm:"column:decision_at" json:"decision_at,omitempty"`
	DecisionComment *string    `gorm:"column:decision_comment" json:"decision_comment,omitempty"`
	CreatedAt       time.Time  `gorm:"column:created_at" json:"created_at"`
}

func (CertificationItem) TableName() string {
	return "certification_items"
}

// CreateCampaignInput holds input for creating a campaign.
type CreateCampaignInput struct {
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	ReviewerID  string     `json:"reviewer_id"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
}

// CampaignList holds a list of campaigns.
type CampaignList struct {
	Campaigns []Campaign `json:"campaigns"`
	Total     int        `json:"total"`
}

// CampaignRepository defines storage operations for campaigns.
type CampaignRepository interface {
	CreateCampaign(ctx context.Context, c Campaign) (string, error)
	GetCampaign(ctx context.Context, tenantID, id string) (Campaign, error)
	ListCampaigns(ctx context.Context, tenantID, status string) ([]Campaign, error)
	UpdateCampaignStatus(ctx context.Context, id, status string) error
	DeleteCampaign(ctx context.Context, tenantID, id string) error

	// Items
	CreateItem(ctx context.Context, item CertificationItem) (string, error)
	GetItem(ctx context.Context, itemID string) (CertificationItem, error)
	ListItems(ctx context.Context, campaignID, decision string) ([]CertificationItem, error)
	ListItemsByReviewer(ctx context.Context, tenantID, reviewerID string) ([]CertificationItem, error)
	UpdateItemDecision(ctx context.Context, itemID, decision, comment string) error
}

type sqlCampaignRepository struct {
	db *gorm.DB
}

// NewCampaignRepository creates a new campaign repository.
func NewCampaignRepository(db *gorm.DB) CampaignRepository {
	return &sqlCampaignRepository{db: db}
}

func (s *sqlCampaignRepository) CreateCampaign(ctx context.Context, c Campaign) (string, error) {
	c.Status = "draft"
	if err := s.db.WithContext(ctx).Omit("ID").Create(&c).Error; err != nil {
		return "", err
	}
	return c.ID, nil
}

func (s *sqlCampaignRepository) GetCampaign(ctx context.Context, tenantID, id string) (Campaign, error) {
	var c Campaign
	if err := s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&c).Error; err != nil {
		return Campaign{}, err
	}
	return c, nil
}

func (s *sqlCampaignRepository) ListCampaigns(ctx context.Context, tenantID, status string) ([]Campaign, error) {
	var campaigns []Campaign
	query := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&campaigns).Error; err != nil {
		return nil, err
	}
	return campaigns, nil
}

func (s *sqlCampaignRepository) UpdateCampaignStatus(ctx context.Context, id, status string) error {
	return s.db.WithContext(ctx).Model(&Campaign{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": status, "updated_at": gorm.Expr("NOW()")}).Error
}

func (s *sqlCampaignRepository) DeleteCampaign(ctx context.Context, tenantID, id string) error {
	return s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&Campaign{}).Error
}

func (s *sqlCampaignRepository) CreateItem(ctx context.Context, item CertificationItem) (string, error) {
	if err := s.db.WithContext(ctx).Omit("ID").Create(&item).Error; err != nil {
		return "", err
	}
	return item.ID, nil
}

func (s *sqlCampaignRepository) GetItem(ctx context.Context, itemID string) (CertificationItem, error) {
	var item CertificationItem
	if err := s.db.WithContext(ctx).Where("id = ?", itemID).First(&item).Error; err != nil {
		return CertificationItem{}, err
	}
	return item, nil
}

func (s *sqlCampaignRepository) ListItems(ctx context.Context, campaignID, decision string) ([]CertificationItem, error) {
	var items []CertificationItem
	query := s.db.WithContext(ctx).Where("campaign_id = ?", campaignID).Order("created_at ASC")
	if decision != "" {
		query = query.Where("decision = ?", decision)
	} else {
		query = query.Where("decision IS NULL")
	}
	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *sqlCampaignRepository) ListItemsByReviewer(ctx context.Context, tenantID, reviewerID string) ([]CertificationItem, error) {
	var items []CertificationItem
	// GORM raw query for joins
	query := `
		SELECT i.* 
		FROM certification_items i
		JOIN certification_campaigns c ON i.campaign_id = c.id
		WHERE c.tenant_id = ? AND c.reviewer_id = ? AND c.status = 'active' AND i.decision IS NULL
		ORDER BY c.created_at ASC, i.user_id ASC
	`
	if err := s.db.WithContext(ctx).Raw(query, tenantID, reviewerID).Scan(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *sqlCampaignRepository) UpdateItemDecision(ctx context.Context, itemID, decision, comment string) error {
	updates := map[string]interface{}{
		"decision":         decision,
		"decision_comment": comment,
		"decision_at":      gorm.Expr("NOW()"),
	}
	return s.db.WithContext(ctx).Model(&CertificationItem{}).Where("id = ?", itemID).Updates(updates).Error
}
