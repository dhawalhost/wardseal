package directory

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines the interface for database operations.
type Repository interface {
	HealthCheck(ctx context.Context) error

	// Transaction support
	WithTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error

	// User operations
	CreateIdentity(ctx context.Context, tx *gorm.DB, tenantID string) (string, error)
	CreateAccount(ctx context.Context, tx *gorm.DB, userID, tenantID, email, passwordHash string) error
	GetUserByID(ctx context.Context, tenantID, id string) (User, error)
	GetUserByEmail(ctx context.Context, tenantID, email string) (User, error)
	ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]User, int, error)
	UpdateIdentity(ctx context.Context, tx *gorm.DB, tenantID, id, status string) error
	UpdateAccount(ctx context.Context, tx *gorm.DB, tenantID, id, email, passwordHash string) error
	DeleteIdentity(ctx context.Context, tenantID, id string) error

	// Group operations
	CreateGroup(ctx context.Context, tenantID string, name string) (string, error)
	GetGroupByID(ctx context.Context, tenantID, id string) (Group, error)
	ListGroups(ctx context.Context, tenantID string, limit, offset int) ([]Group, int, error)
	UpdateGroup(ctx context.Context, tenantID, id, name string) error
	DeleteGroup(ctx context.Context, tenantID, id string) error

	// Membership
	AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error

	// Organization
	AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error
	RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error
	ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error)

	// Tenant
	CreateTenant(ctx context.Context, id, name, slug, plan string) error
	GetTenantIDBySlug(ctx context.Context, slug string) (string, error)
	GetTenantIDByEmail(ctx context.Context, email string) (string, error)
	GetPasswordHash(ctx context.Context, tenantID, email string) (User, string, error)

	// API Keys (for SCIM/Integrations)
	GetAPIKeyByPrefix(ctx context.Context, prefix string) ([]APIKeyCandidate, error)
	UpdateAPIKeyLastUsed(ctx context.Context, id, tenantID string) error
}

type APIKeyCandidate struct {
	ID       string `gorm:"column:id"`
	TenantID string `gorm:"column:tenant_id"`
	KeyHash  string `gorm:"column:key_hash"`
}

type sqlRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &sqlRepository{db: db}
}

func (r *sqlRepository) getDB(ctx context.Context, tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx.WithContext(ctx)
	}
	return r.db.WithContext(ctx)
}

func (r *sqlRepository) HealthCheck(ctx context.Context) error {
	sqlDB, err := r.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func (r *sqlRepository) WithTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *sqlRepository) CreateIdentity(ctx context.Context, tx *gorm.DB, tenantID string) (string, error) {
	var id string
	query := `INSERT INTO identities (tenant_id, status) VALUES (?, ?) RETURNING id`
	err := r.getDB(ctx, tx).Raw(query, tenantID, "active").Scan(&id).Error
	return id, err
}

func (r *sqlRepository) CreateAccount(ctx context.Context, tx *gorm.DB, userID, tenantID, email, passwordHash string) error {
	query := `INSERT INTO accounts (identity_id, tenant_id, login, password_hash) VALUES (?, ?, ?, ?)`
	return r.getDB(ctx, tx).Exec(query, userID, tenantID, email, passwordHash).Error
}

func (r *sqlRepository) GetUserByID(ctx context.Context, tenantID, id string) (User, error) {
	var user User
	err := r.db.WithContext(ctx).Raw(`SELECT i.id, i.tenant_id, a.login AS email, i.status, i.created_at, i.updated_at
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE i.id = ? AND i.tenant_id = ?`,
		id, tenantID).Scan(&user).Error
	if err != nil {
		return user, err
	}
	if user.ID == "" {
		return user, gorm.ErrRecordNotFound
	}
	return user, nil
}

func (r *sqlRepository) GetUserByEmail(ctx context.Context, tenantID, email string) (User, error) {
	var user User
	err := r.db.WithContext(ctx).Raw(`SELECT i.id, i.tenant_id, a.login AS email, i.status, i.created_at, i.updated_at
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE a.login = ? AND a.tenant_id = ?`,
		email, tenantID).Scan(&user).Error
	if err != nil {
		return user, err
	}
	if user.ID == "" {
		return user, gorm.ErrRecordNotFound
	}
	return user, nil
}

func (r *sqlRepository) GetPasswordHash(ctx context.Context, tenantID, email string) (User, string, error) {
	var record struct {
		User
		PasswordHash string `gorm:"column:password_hash"`
	}
	err := r.db.WithContext(ctx).Raw(`SELECT i.id, i.tenant_id, a.login AS email, i.status, i.created_at, i.updated_at, a.password_hash
		FROM identities i JOIN accounts a ON i.id = a.identity_id
		WHERE a.login = ? AND a.tenant_id = ?`, email, tenantID).Scan(&record).Error
	if err != nil {
		return User{}, "", err
	}
	if record.ID == "" {
		return User{}, "", gorm.ErrRecordNotFound
	}
	return record.User, record.PasswordHash, nil
}

func (r *sqlRepository) ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]User, int, error) {
	var total int64
	if err := r.db.WithContext(ctx).Table("identities").Where("tenant_id = ?", tenantID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []User
	err := r.db.WithContext(ctx).Raw(`SELECT i.id, i.tenant_id, a.login AS email, i.status, i.created_at, i.updated_at
		FROM identities i JOIN accounts a ON i.id = a.identity_id 
		WHERE i.tenant_id = ? 
		ORDER BY i.created_at DESC 
		LIMIT ? OFFSET ?`,
		tenantID, limit, offset).Scan(&users).Error
	return users, int(total), err
}

func (r *sqlRepository) UpdateIdentity(ctx context.Context, tx *gorm.DB, tenantID, id, status string) error {
	query := `UPDATE identities SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`
	return r.getDB(ctx, tx).Exec(query, status, id, tenantID).Error
}

func (r *sqlRepository) UpdateAccount(ctx context.Context, tx *gorm.DB, tenantID, id, email, passwordHash string) error {
	db := r.getDB(ctx, tx)
	if email != "" {
		if err := db.Exec(`UPDATE accounts SET login = ? WHERE identity_id = ? AND tenant_id = ?`, email, id, tenantID).Error; err != nil {
			return err
		}
	}
	if passwordHash != "" {
		if err := db.Exec(`UPDATE accounts SET password_hash = ? WHERE identity_id = ? AND tenant_id = ?`, passwordHash, id, tenantID).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *sqlRepository) DeleteIdentity(ctx context.Context, tenantID, id string) error {
	return r.db.WithContext(ctx).Exec(`DELETE FROM identities WHERE id = ? AND tenant_id = ?`, id, tenantID).Error
}

func (r *sqlRepository) CreateGroup(ctx context.Context, tenantID string, name string) (string, error) {
	var id string
	err := r.db.WithContext(ctx).Raw(`INSERT INTO groups (tenant_id, name) VALUES (?, ?) RETURNING id`, tenantID, name).Scan(&id).Error
	return id, err
}

func (r *sqlRepository) GetGroupByID(ctx context.Context, tenantID, id string) (Group, error) {
	var group Group
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, name, created_at, updated_at FROM groups WHERE id = ? AND tenant_id = ?`, id, tenantID).Scan(&group).Error
	if err != nil {
		return group, err
	}
	if group.ID == "" {
		return group, gorm.ErrRecordNotFound
	}
	return group, nil
}

func (r *sqlRepository) ListGroups(ctx context.Context, tenantID string, limit, offset int) ([]Group, int, error) {
	var total int64
	if err := r.db.WithContext(ctx).Table("groups").Where("tenant_id = ?", tenantID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var groups []Group
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, name, created_at, updated_at FROM groups WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, tenantID, limit, offset).Scan(&groups).Error
	return groups, int(total), err
}

func (r *sqlRepository) UpdateGroup(ctx context.Context, tenantID, id, name string) error {
	return r.db.WithContext(ctx).Exec(`UPDATE groups SET name = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`, name, id, tenantID).Error
}

func (r *sqlRepository) DeleteGroup(ctx context.Context, tenantID, id string) error {
	return r.db.WithContext(ctx).Exec(`DELETE FROM groups WHERE id = ? AND tenant_id = ?`, id, tenantID).Error
}

func (r *sqlRepository) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	query := `INSERT INTO identity_groups (identity_id, group_id, tenant_id)
		SELECT ?::uuid, ?::uuid, ?::varchar
		WHERE EXISTS (SELECT 1 FROM identities WHERE id = ?::uuid AND tenant_id = ?::varchar)
		AND EXISTS (SELECT 1 FROM groups WHERE id = ?::uuid AND tenant_id = ?::varchar)`
	return r.db.WithContext(ctx).Exec(query, userID, groupID, tenantID, userID, tenantID, groupID, tenantID).Error
}

func (r *sqlRepository) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	return r.db.WithContext(ctx).Exec(`DELETE FROM identity_groups WHERE identity_id = ? AND group_id = ? AND tenant_id = ?`, userID, groupID, tenantID).Error
}

func (r *sqlRepository) AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error {
	return r.db.WithContext(ctx).Exec(`INSERT INTO user_organizations (tenant_id, user_id, org_id, role) VALUES (?, ?, ?, ?)
		 ON CONFLICT (tenant_id, user_id, org_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()`, tenantID, userID, orgID, role).Error
}

func (r *sqlRepository) RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error {
	return r.db.WithContext(ctx).Exec(`DELETE FROM user_organizations WHERE tenant_id = ? AND user_id = ? AND org_id = ?`, tenantID, userID, orgID).Error
}

func (r *sqlRepository) ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error) {
	var orgIDs []string
	err := r.db.WithContext(ctx).Raw(`SELECT org_id FROM user_organizations WHERE tenant_id = ? AND user_id = ?`, tenantID, userID).Scan(&orgIDs).Error
	return orgIDs, err
}

func (r *sqlRepository) CreateTenant(ctx context.Context, id, name, slug, plan string) error {
	return r.db.WithContext(ctx).Exec(`INSERT INTO tenants (id, name, slug, plan, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`, id, name, slug, plan).Error
}

func (r *sqlRepository) GetTenantIDBySlug(ctx context.Context, slug string) (string, error) {
	var id string
	err := r.db.WithContext(ctx).Raw(`SELECT id FROM tenants WHERE slug = ?`, slug).Scan(&id).Error
	if id == "" {
		return "", nil // API expects empty string instead of err for nil
	}
	return id, err
}

func (r *sqlRepository) GetTenantIDByEmail(ctx context.Context, email string) (string, error) {
	var tenantID string
	err := r.db.WithContext(ctx).Raw(`SELECT tenant_id FROM accounts WHERE login = ? LIMIT 1`, email).Scan(&tenantID).Error
	if tenantID == "" {
		return "", nil // API expects empty string instead of err for nil
	}
	return tenantID, err
}

func (r *sqlRepository) GetAPIKeyByPrefix(ctx context.Context, prefix string) ([]APIKeyCandidate, error) {
	var candidates []APIKeyCandidate
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, key_hash FROM api_keys WHERE key_prefix = ? AND status = 'active'`, prefix).Scan(&candidates).Error
	return candidates, err
}

func (r *sqlRepository) UpdateAPIKeyLastUsed(ctx context.Context, id, tenantID string) error {
	return r.db.WithContext(ctx).Exec(`UPDATE api_keys SET last_used_at = NOW() WHERE id = ? AND tenant_id = ?`, id, tenantID).Error
}
