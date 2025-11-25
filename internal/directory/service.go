package directory

import (
	"context"
	"database/sql" // Keep for sql.NullString in GetUserByEmail

	"github.com/dhawalhost/velverify/internal/directory/endpoint" // Import endpoint package
	"github.com/jmoiron/sqlx" // Import sqlx
	"golang.org/x/crypto/bcrypt"
)

// Service defines the interface for the directory service.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)

	// User management
	CreateUser(ctx context.Context, tenantID string, user endpoint.User) (string, error)
	GetUserByID(ctx context.Context, tenantID, id string) (endpoint.User, error)
	GetUserByEmail(ctx context.Context, tenantID, email string) (endpoint.User, error)
	UpdateUser(ctx context.Context, tenantID, id string, user endpoint.User) error
	DeleteUser(ctx context.Context, tenantID, id string) error

	// Group management
	CreateGroup(ctx context.Context, tenantID string, group endpoint.Group) (string, error)
	GetGroupByID(ctx context.Context, tenantID, id string) (endpoint.Group, error)
	UpdateGroup(ctx context.Context, tenantID, id string, group endpoint.Group) error
	DeleteGroup(ctx context.Context, tenantID, id string) error

	// Group membership
	AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error
}

type directoryService struct {
	db *sqlx.DB // Use sqlx.DB
}

// NewService creates a new directory service.
func NewService(db *sqlx.DB) Service { // Use sqlx.DB
	return &directoryService{db: db}
}

func (s *directoryService) HealthCheck(ctx context.Context) (bool, error) {
	err := s.db.PingContext(ctx)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *directoryService) CreateUser(ctx context.Context, tenantID string, user endpoint.User) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	tx, err := s.db.BeginTxx(ctx, nil) // Use BeginTxx for sqlx
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	var userID string
	err = tx.QueryRowxContext(ctx, // Use QueryRowxContext for sqlx
		`INSERT INTO identities (tenant_id, status) VALUES ($1, $2) RETURNING id`,
		tenantID, "active").Scan(&userID)
	if err != nil {
		return "", err
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO accounts (identity_id, login, password_hash) VALUES ($1, $2, $3)`,
		userID, user.Email, string(hashedPassword))
	if err != nil {
		return "", err
	}

	return userID, tx.Commit()
}

func (s *directoryService) GetUserByID(ctx context.Context, tenantID, id string) (endpoint.User, error) {
	var user endpoint.User
	err := s.db.GetContext(ctx, &user, `SELECT i.id, i.tenant_id, a.login AS email, i.status, i.created_at, i.updated_at
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE i.id = $1 AND i.tenant_id = $2`,
		id, tenantID)
	return user, err
}

func (s *directoryService) GetUserByEmail(ctx context.Context, tenantID, email string) (endpoint.User, error) {
	var user endpoint.User
	err := s.db.GetContext(ctx, &user, `SELECT i.id, i.tenant_id, a.login AS email, a.password_hash AS password, i.status, i.created_at, i.updated_at
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE a.login = $1 AND i.tenant_id = $2`,
		email, tenantID)
	return user, err
}

func (s *directoryService) UpdateUser(ctx context.Context, tenantID, id string, user endpoint.User) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if user.Email != "" {
		_, err := tx.ExecContext(ctx, `UPDATE accounts SET login = $1 WHERE identity_id = $2 AND EXISTS (SELECT 1 FROM identities WHERE id = $2 AND tenant_id = $3)`, user.Email, id, tenantID)
		if err != nil {
			return err
		}
	}

	if user.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE accounts SET password_hash = $1 WHERE identity_id = $2 AND EXISTS (SELECT 1 FROM identities WHERE id = $2 AND tenant_id = $3)`, string(hashedPassword), id, tenantID)
		if err != nil {
			return err
		}
	}

	if user.Status != "" {
		_, err := tx.ExecContext(ctx, `UPDATE identities SET status = $1 WHERE id = $2 AND tenant_id = $3`, user.Status, id, tenantID)
		if err != nil {
			return err
		}
	}

	_, err = tx.ExecContext(ctx, `UPDATE identities SET updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *directoryService) DeleteUser(ctx context.Context, tenantID, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM identities WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	return err
}

func (s *directoryService) CreateGroup(ctx context.Context, tenantID string, group endpoint.Group) (string, error) {
	var groupID string
	err := s.db.QueryRowxContext(ctx,
		`INSERT INTO groups (tenant_id, name) VALUES ($1, $2) RETURNING id`,
		tenantID, group.Name).Scan(&groupID)
	return groupID, err
}

func (s *directoryService) GetGroupByID(ctx context.Context, tenantID, id string) (endpoint.Group, error) {
	var group endpoint.Group
	err := s.db.GetContext(ctx, &group, `SELECT id, tenant_id, name, created_at, updated_at FROM groups WHERE id = $1 AND tenant_id = $2`,
		id, tenantID)
	return group, err
}

func (s *directoryService) UpdateGroup(ctx context.Context, tenantID, id string, group endpoint.Group) error {
	_, err := s.db.ExecContext(ctx, `UPDATE groups SET name = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, group.Name, id, tenantID)
	return err
}

func (s *directoryService) DeleteGroup(ctx context.Context, tenantID, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM groups WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	return err
}

func (s *directoryService) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO identity_groups (identity_id, group_id)
	SELECT $1, $2
	WHERE EXISTS (SELECT 1 FROM identities WHERE id = $1 AND tenant_id = $3)
	AND EXISTS (SELECT 1 FROM groups WHERE id = $2 AND tenant_id = $3)`, userID, groupID, tenantID)
	return err
}

func (s *directoryService) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM identity_groups
	WHERE identity_id = $1 AND group_id = $2
	AND EXISTS (SELECT 1 FROM identities WHERE id = $1 AND tenant_id = $3)
	AND EXISTS (SELECT 1 FROM groups WHERE id = $2 AND tenant_id = $3)`, userID, groupID, tenantID)
	return err
}