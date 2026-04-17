package oauthclient

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// sqlRepository provides CRUD helpers for oauth_clients.
type sqlRepository struct {
	db *gorm.DB
}

// NewRepository creates a new Repository instance.
func NewRepository(db *gorm.DB) Repository {
	return &sqlRepository{db: db}
}

// ListClients returns all OAuth clients across tenants.
func (r *sqlRepository) ListClients(ctx context.Context) ([]Client, error) {
	var clients []Client
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, client_id, client_type, name, description,
        redirect_uris, allowed_scopes, client_secret_hash, created_at, updated_at FROM oauth_clients`).Scan(&clients).Error
	return clients, err
}

// ListClientsByTenant returns all clients for a tenant.
func (r *sqlRepository) ListClientsByTenant(ctx context.Context, tenantID string) ([]Client, error) {
	var clients []Client
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, client_id, client_type, name, description,
        redirect_uris, allowed_scopes, client_secret_hash, created_at, updated_at
        FROM oauth_clients WHERE tenant_id = ?`, tenantID).Scan(&clients).Error
	return clients, err
}

// GetClient fetches a client by tenant and client_id.
func (r *sqlRepository) GetClient(ctx context.Context, tenantID, clientID string) (Client, error) {
	var client Client
	err := r.db.WithContext(ctx).Raw(`SELECT id, tenant_id, client_id, client_type, name, description,
        redirect_uris, allowed_scopes, client_secret_hash, created_at, updated_at
        FROM oauth_clients WHERE tenant_id = ? AND client_id = ?`, tenantID, clientID).Scan(&client).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Client{}, ErrNotFound
		}
		return Client{}, err
	}
	return client, nil
}

// CreateClient inserts a new OAuth client.
func (r *sqlRepository) CreateClient(ctx context.Context, params CreateClientParams) (Client, error) {
	var client Client
	err := r.db.WithContext(ctx).Raw(`INSERT INTO oauth_clients
        (tenant_id, client_id, client_type, name, description, redirect_uris, allowed_scopes, client_secret_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, tenant_id, client_id, client_type, name, description, redirect_uris,
                  allowed_scopes, client_secret_hash, created_at, updated_at`,
		params.TenantID, params.ClientID, params.ClientType, params.Name,
		nullableString(params.Description), pq.StringArray(params.RedirectURIs),
		pq.StringArray(params.AllowedScopes), params.ClientSecretHash).Scan(&client).Error
	return client, err
}

// UpdateClient updates mutable fields on an OAuth client.
func (r *sqlRepository) UpdateClient(ctx context.Context, tenantID, clientID string, params UpdateClientParams) (Client, error) {
	err := r.db.WithContext(ctx).Exec(`UPDATE oauth_clients
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            redirect_uris = COALESCE(?::text[], redirect_uris),
            allowed_scopes = COALESCE(?::text[], allowed_scopes),
            client_type = COALESCE(?, client_type),
            client_secret_hash = COALESCE(?::bytea, client_secret_hash),
            updated_at = NOW()
        WHERE tenant_id = ? AND client_id = ?`,
		params.Name, nullableString(params.Description), nullableStringArray(params.RedirectURIs),
		nullableStringArray(params.AllowedScopes), params.ClientType, nullableBytea(params.ClientSecretHash), tenantID, clientID).Error
	if err != nil {
		return Client{}, err
	}
	return r.GetClient(ctx, tenantID, clientID)
}

// DeleteClient removes an OAuth client registration.
func (r *sqlRepository) DeleteClient(ctx context.Context, tenantID, clientID string) error {
	res := r.db.WithContext(ctx).Exec(`DELETE FROM oauth_clients WHERE tenant_id = ? AND client_id = ?`, tenantID, clientID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func nullableString(value *string) sql.NullString {
	if value == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *value, Valid: true}
}

func nullableStringArray(values []string) interface{} {
	if values == nil {
		return nil
	}
	return pq.StringArray(values)
}

func nullableBytea(value *[]byte) interface{} {
	if value == nil {
		return nil
	}
	return *value
}
