package rbac

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Role represents an RBAC role.
type Role struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	TenantID    string         `gorm:"index;not null" json:"tenant_id"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Permission represents an RBAC permission.
type Permission struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	TenantID    string         `gorm:"index;not null" json:"tenant_id"`
	Resource    string         `gorm:"not null" json:"resource"`
	Action      string         `gorm:"not null" json:"action"`
	Description string         `json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserRole represents a user's role assignment.
type UserRole struct {
	UserID     string    `gorm:"primaryKey" json:"user_id"`
	RoleID     string    `gorm:"primaryKey;type:uuid" json:"role_id"`
	TenantID   string    `gorm:"index;not null" json:"tenant_id"`
	AssignedAt time.Time `gorm:"autoCreateTime" json:"assigned_at"`
	AssignedBy *string   `json:"assigned_by,omitempty"`
}

// RolePermission represents the many-to-many relationship between roles and permissions.
type RolePermission struct {
	RoleID       string `gorm:"primaryKey;type:uuid"`
	PermissionID string `gorm:"primaryKey;type:uuid"`
}

// Repository defines RBAC storage operations.
type Repository interface {
	// Roles
	CreateRole(ctx context.Context, r Role) (string, error)
	GetRole(ctx context.Context, tenantID, id string) (Role, error)
	GetRoleByName(ctx context.Context, tenantID, name string) (Role, error)
	ListRoles(ctx context.Context, tenantID string) ([]Role, error)
	UpdateRole(ctx context.Context, id string, r Role) (Role, error)
	DeleteRole(ctx context.Context, tenantID, id string) error

	// Permissions
	CreatePermission(ctx context.Context, p Permission) (string, error)
	ListPermissions(ctx context.Context, tenantID string) ([]Permission, error)
	GetPermissionsByRole(ctx context.Context, roleID string) ([]Permission, error)

	// Role-Permission mapping
	AssignPermissionToRole(ctx context.Context, roleID, permissionID string) error
	RemovePermissionFromRole(ctx context.Context, roleID, permissionID string) error

	// User-Role mapping
	AssignRoleToUser(ctx context.Context, tenantID, userID, roleID string, assignedBy *string) error
	RemoveRoleFromUser(ctx context.Context, userID, roleID string) error
	GetUserRoles(ctx context.Context, tenantID, userID string) ([]Role, error)
	GetUserPermissions(ctx context.Context, tenantID, userID string) ([]Permission, error)
}

type gormRepository struct {
	db *gorm.DB
}

// NewRepository creates a new RBAC repository.
func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (s *gormRepository) CreateRole(ctx context.Context, r Role) (string, error) {
	err := s.db.WithContext(ctx).Create(&r).Error
	return r.ID, err
}

func (s *gormRepository) GetRole(ctx context.Context, tenantID, id string) (Role, error) {
	var r Role
	err := s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&r).Error
	return r, err
}

func (s *gormRepository) GetRoleByName(ctx context.Context, tenantID, name string) (Role, error) {
	var r Role
	err := s.db.WithContext(ctx).Where("name = ? AND tenant_id = ?", name, tenantID).First(&r).Error
	return r, err
}

func (s *gormRepository) ListRoles(ctx context.Context, tenantID string) ([]Role, error) {
	var roles []Role
	err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("name").Find(&roles).Error
	return roles, err
}

func (s *gormRepository) UpdateRole(ctx context.Context, id string, r Role) (Role, error) {
	var existing Role
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&existing).Error; err != nil {
		return r, err
	}
	existing.Name = r.Name
	existing.Description = r.Description
	err := s.db.WithContext(ctx).Save(&existing).Error
	return existing, err
}

func (s *gormRepository) DeleteRole(ctx context.Context, tenantID, id string) error {
	return s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&Role{}).Error
}

func (s *gormRepository) CreatePermission(ctx context.Context, p Permission) (string, error) {
	err := s.db.WithContext(ctx).Create(&p).Error
	return p.ID, err
}

func (s *gormRepository) ListPermissions(ctx context.Context, tenantID string) ([]Permission, error) {
	var perms []Permission
	err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("resource, action").Find(&perms).Error
	return perms, err
}

func (s *gormRepository) GetPermissionsByRole(ctx context.Context, roleID string) ([]Permission, error) {
	var perms []Permission
	err := s.db.WithContext(ctx).
		Joins("JOIN role_permissions rp ON permissions.id = rp.permission_id").
		Where("rp.role_id = ?", roleID).
		Find(&perms).Error
	return perms, err
}

func (s *gormRepository) AssignPermissionToRole(ctx context.Context, roleID, permissionID string) error {
	return s.db.WithContext(ctx).Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING", roleID, permissionID).Error
}

func (s *gormRepository) RemovePermissionFromRole(ctx context.Context, roleID, permissionID string) error {
	return s.db.WithContext(ctx).Exec("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?", roleID, permissionID).Error
}

func (s *gormRepository) AssignRoleToUser(ctx context.Context, tenantID, userID, roleID string, assignedBy *string) error {
	ur := UserRole{
		UserID:     userID,
		RoleID:     roleID,
		TenantID:   tenantID,
		AssignedBy: assignedBy,
	}
	return s.db.WithContext(ctx).Clauses(nil).Create(&ur).Error
}

func (s *gormRepository) RemoveRoleFromUser(ctx context.Context, userID, roleID string) error {
	return s.db.WithContext(ctx).Where("user_id = ? AND role_id = ?", userID, roleID).Delete(&UserRole{}).Error
}

func (s *gormRepository) GetUserRoles(ctx context.Context, tenantID, userID string) ([]Role, error) {
	var roles []Role
	err := s.db.WithContext(ctx).
		Joins("JOIN user_roles ur ON roles.id = ur.role_id").
		Where("ur.user_id = ? AND ur.tenant_id = ?", userID, tenantID).
		Find(&roles).Error
	return roles, err
}

func (s *gormRepository) GetUserPermissions(ctx context.Context, tenantID, userID string) ([]Permission, error) {
	var perms []Permission
	err := s.db.WithContext(ctx).
		Raw(`SELECT DISTINCT p.* FROM permissions p
			 JOIN role_permissions rp ON p.id = rp.permission_id
			 JOIN user_roles ur ON rp.role_id = ur.role_id
			 WHERE ur.user_id = ? AND ur.tenant_id = ?`, userID, tenantID).
		Scan(&perms).Error
	return perms, err
}
