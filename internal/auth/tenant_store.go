package auth

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// TenantRepository defines the interface for tenant-related database operations.
type TenantRepository interface {
	GetIDBySlug(ctx context.Context, slug string) (string, error)
	GetSlugByID(ctx context.Context, id string) (string, error)
}

// sqlTenantRepository implements TenantRepository using sqlx.
type sqlTenantRepository struct {
	db *gorm.DB
}

// NewTenantRepository creates a new TenantRepository.
func NewTenantRepository(db *gorm.DB) TenantRepository {
	return &sqlTenantRepository{db: db}
}

func (r *sqlTenantRepository) GetIDBySlug(ctx context.Context, slug string) (string, error) {
	var id string
	query := `SELECT id FROM tenants WHERE slug = $1`
	err := r.db.WithContext(ctx).Raw(query, slug).Scan(&id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return id, nil
}

func (r *sqlTenantRepository) GetSlugByID(ctx context.Context, id string) (string, error) {
	var slug string
	query := `SELECT slug FROM tenants WHERE id = $1`
	err := r.db.WithContext(ctx).Raw(query, id).Scan(&slug).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return slug, nil
}
