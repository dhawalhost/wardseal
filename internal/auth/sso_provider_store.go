package auth

import (
	"context"
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
)

// SSOProvider represents a configuration for an external Identity Provider (OIDC/SAML).
type SSOProvider struct {
	ID       string `db:"id"`
	TenantID string `db:"tenant_id"`
	Name     string `db:"name"` // e.g. "google", "okta-corp"
	Type     string `db:"type"` // "oidc" or "saml"
	Enabled  bool   `db:"enabled"`

	// OIDC Fields
	OIDCIssuerURL    *string `db:"oidc_issuer_url"`
	OIDCClientID     *string `db:"oidc_client_id"`
	OIDCClientSecret []byte  `db:"oidc_client_secret"`
	OIDCScopes       *string `db:"oidc_scopes"`

	// SAML Fields (omitted for brevity as we are focusing on OIDC Social Login here)
}

// SSOProviderStore handles database operations for SSO providers.
type SSOProviderStore interface {
	GetByName(ctx context.Context, tenantID, name string) (*SSOProvider, error)
}

type SQLSSOProviderStore struct {
	db *sqlx.DB
}

func NewSQLSSOProviderStore(db *sqlx.DB) *SQLSSOProviderStore {
	return &SQLSSOProviderStore{db: db}
}

func (s *SQLSSOProviderStore) GetByName(ctx context.Context, tenantID, name string) (*SSOProvider, error) {
	var p SSOProvider
	// We select only relevant fields for OIDC/Social login for now
	query := `
		SELECT id, tenant_id, name, type, enabled, 
		       oidc_issuer_url, oidc_client_id, oidc_client_secret, oidc_scopes
		FROM sso_providers 
		WHERE tenant_id = $1 AND name = $2 AND enabled = true
	`
	err := s.db.GetContext(ctx, &p, query, tenantID, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Not found
		}
		return nil, err
	}
	return &p, nil
}
