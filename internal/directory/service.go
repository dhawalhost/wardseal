package directory

import (
	"context"
	"database/sql"

	"golang.org/x/crypto/bcrypt"
)

// Service defines the interface for the directory service.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)

	// User management
	CreateUser(ctx context.Context, tenantID string, user User) (string, error)
	GetUserByID(ctx context.Context, tenantID, id string) (User, error)
	GetUserByEmail(ctx context.Context, tenantID, email string) (User, error)
	UpdateUser(ctx context.Context, tenantID, id string, user User) error
	DeleteUser(ctx context.Context, tenantID, id string) error

	// Group management
	CreateGroup(ctx context.Context, tenantID string, group Group) (string, error)
	GetGroupByID(ctx context.Context, tenantID, id string) (Group, error)
	UpdateGroup(ctx context.Context, tenantID, id string, group Group) error
	DeleteGroup(ctx context.Context, tenantID, id string) error

	// Group membership
	AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error
}

type directoryService struct {
	db *sql.DB
}

// NewService creates a new directory service.
func NewService(db *sql.DB) Service {
	return &directoryService{db: db}
}

func (s *directoryService) HealthCheck(ctx context.Context) (bool, error) {
	err := s.db.PingContext(ctx)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *directoryService) CreateUser(ctx context.Context, tenantID string, user User) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	var userID string
	err = s.db.QueryRowContext(ctx,
		`INSERT INTO identities (tenant_id, status) VALUES ($1, $2) RETURNING id`,
		tenantID, "active").Scan(&userID)
	if err != nil {
		return "", err
	}

	_, err = s.db.ExecContext(ctx,
		`INSERT INTO accounts (identity_id, login, password_hash) VALUES ($1, $2, $3)`,
		userID, user.Email, string(hashedPassword))
	if err != nil {
		// If creating the account fails, we should probably roll back the identity creation.
		// For now, we'll just return the error.
		return "", err
	}

	return userID, nil
}

func (s *directoryService) GetUserByID(ctx context.Context, tenantID, id string) (User, error) {
	var user User
	err := s.db.QueryRowContext(ctx,
		`SELECT i.id, i.tenant_id, a.login, i.status, i.created_at, i.updated_at 
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE i.id = $1 AND i.tenant_id = $2`,
		id, tenantID).Scan(&user.ID, &user.TenantID, &user.Email, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *directoryService) GetUserByEmail(ctx context.Context, tenantID, email string) (User, error) {
	var user User
	var passwordHash sql.NullString
	err := s.db.QueryRowContext(ctx,
		`SELECT i.id, i.tenant_id, a.login, a.password_hash, i.status, i.created_at, i.updated_at
		 FROM identities i JOIN accounts a ON i.id = a.identity_id WHERE a.login = $1 AND i.tenant_id = $2`,
		email, tenantID).Scan(&user.ID, &user.TenantID, &user.Email, &passwordHash, &user.Status, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return User{}, err
	}
	if passwordHash.Valid {
		user.Password = passwordHash.String
	}
	return user, nil
}

func (s *directoryService) UpdateUser(ctx context.Context, tenantID, id string, user User) error {
	tx, err := s.db.BeginTx(ctx, nil)
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

func (s *directoryService) CreateGroup(ctx context.Context, tenantID string, group Group) (string, error) {
	var groupID string
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO groups (tenant_id, name) VALUES ($1, $2) RETURNING id`,
		tenantID, group.Name).Scan(&groupID)
	if err != nil {
		return "", err
	}
	return groupID, nil
}

func (s *directoryService) GetGroupByID(ctx context.Context, tenantID, id string) (Group, error) {
	var group Group
	err := s.db.QueryRowContext(ctx,
		`SELECT id, tenant_id, name, created_at, updated_at FROM groups WHERE id = $1 AND tenant_id = $2`,
		id, tenantID).Scan(&group.ID, &group.TenantID, &group.Name, &group.CreatedAt, &group.UpdatedAt)
	if err != nil {
		return Group{}, err
	}
	return group, nil
}

func (s *directoryService) UpdateGroup(ctx context.Context, tenantID, id string, group Group) error {
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

// User represents a user in the system.
type User struct {
	ID        string `json:"id,omitempty"`
	TenantID  string `json:"tenant_id,omitempty"`
	Email     string `json:"email"`
	Password  string `json:"password,omitempty"`
	Status    string `json:"status,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// Group represents a group in the system.
type Group struct {
	ID        string `json:"id,omitempty"`
	TenantID  string `json:"tenant_id,omitempty"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}
