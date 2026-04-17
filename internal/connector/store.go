package connector

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines connector storage operations.
type Repository interface {
	Create(ctx context.Context, config Config) (string, error)
	Get(ctx context.Context, tenantID, id string) (Config, error)
	List(ctx context.Context, tenantID string) ([]Config, error)
	Update(ctx context.Context, config Config) error
	Delete(ctx context.Context, tenantID, id string) error
	Toggle(ctx context.Context, tenantID, id string, enabled bool) error
}

type gormRepository struct {
	db *gorm.DB
}

// NewRepository creates a new connector repository.
func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (s *gormRepository) Create(ctx context.Context, config Config) (string, error) {
	err := s.db.WithContext(ctx).Create(&config).Error
	return config.ID, err
}

func (s *gormRepository) Get(ctx context.Context, tenantID, id string) (Config, error) {
	var c Config
	err := s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&c).Error
	return c, err
}

func (s *gormRepository) List(ctx context.Context, tenantID string) ([]Config, error) {
	var configs []Config
	err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("name").Find(&configs).Error
	return configs, err
}

func (s *gormRepository) Update(ctx context.Context, config Config) error {
	return s.db.WithContext(ctx).Save(&config).Error
}

func (s *gormRepository) Delete(ctx context.Context, tenantID, id string) error {
	return s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&Config{}).Error
}

func (s *gormRepository) Toggle(ctx context.Context, tenantID, id string, enabled bool) error {
	return s.db.WithContext(ctx).Model(&Config{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("enabled", enabled).Error
}
