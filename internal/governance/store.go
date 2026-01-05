package governance

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// Store defines database operations for governance.
type Store interface {
	CreateRequest(ctx context.Context, req AccessRequest) (string, error)
	GetRequest(ctx context.Context, tenantID, id string) (AccessRequest, error)
	ListRequests(ctx context.Context, tenantID, status string) ([]AccessRequest, error)
	UpdateRequestStatus(ctx context.Context, id, status string) error
}

type sqlStore struct {
	db *sqlx.DB
}

// NewStore creates a new governance store.
func NewStore(db *sqlx.DB) Store {
	return &sqlStore{db: db}
}

func (s *sqlStore) CreateRequest(ctx context.Context, req AccessRequest) (string, error) {
	var id string
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO access_requests (tenant_id, requester_id, resource_type, resource_id, reason, status)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		req.TenantID, req.RequesterID, req.ResourceType, req.ResourceID, req.Reason, "pending").Scan(&id)
	if err != nil {
		return "", fmt.Errorf("failed to create access request: %w", err)
	}
	return id, nil
}

func (s *sqlStore) GetRequest(ctx context.Context, tenantID, id string) (AccessRequest, error) {
	var req AccessRequest
	// Note: We scan created_at/updated_at as time.Time then format to string in Service if needed,
	// or scan to string if Postgres driver supports it. Default scanning to struct string requires compatibility.
	// But our struct has string for CreatedAt. Let's use a temporary struct or assume Service handles conversion.
	// Actually for simplicity, let's change struct to use time.Time or custom scanner.
	// But since I already defined struct with string in types.go, I will Scan into time.Time and convert.

	row := s.db.QueryRowxContext(ctx, `SELECT id, tenant_id, requester_id, resource_type, resource_id, status, reason, created_at, updated_at
		FROM access_requests WHERE id = $1 AND tenant_id = $2`, id, tenantID)

	var createdAt, updatedAt time.Time
	err := row.Scan(&req.ID, &req.TenantID, &req.RequesterID, &req.ResourceType, &req.ResourceID, &req.Status, &req.Reason, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return AccessRequest{}, fmt.Errorf("request not found")
		}
		return AccessRequest{}, err
	}
	req.CreatedAt = createdAt.Format(time.RFC3339)
	req.UpdatedAt = updatedAt.Format(time.RFC3339)
	return req, nil
}

func (s *sqlStore) ListRequests(ctx context.Context, tenantID, status string) ([]AccessRequest, error) {
	query := `SELECT id, tenant_id, requester_id, resource_type, resource_id, status, reason, created_at, updated_at
		FROM access_requests WHERE tenant_id = $1`
	args := []interface{}{tenantID}

	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var requests []AccessRequest
	for rows.Next() {
		var req AccessRequest
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&req.ID, &req.TenantID, &req.RequesterID, &req.ResourceType, &req.ResourceID, &req.Status, &req.Reason, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		req.CreatedAt = createdAt.Format(time.RFC3339)
		req.UpdatedAt = updatedAt.Format(time.RFC3339)
		requests = append(requests, req)
	}
	return requests, nil
}

func (s *sqlStore) UpdateRequestStatus(ctx context.Context, id, status string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE access_requests SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	return err
}
