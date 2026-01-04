package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// DeveloperApp represents a self-registered OAuth application.
type DeveloperApp struct {
	ID               string          `db:"id" json:"id"`
	TenantID         string          `db:"tenant_id" json:"tenant_id"`
	OwnerID          string          `db:"owner_id" json:"owner_id"`
	Name             string          `db:"name" json:"name"`
	Description      *string         `db:"description" json:"description,omitempty"`
	ClientID         string          `db:"client_id" json:"client_id"`
	ClientSecretHash string          `db:"client_secret_hash" json:"-"`
	RedirectURIs     json.RawMessage `db:"redirect_uris" json:"redirect_uris"`
	GrantTypes       json.RawMessage `db:"grant_types" json:"grant_types"`
	Scopes           json.RawMessage `db:"scopes" json:"scopes"`
	AppType          string          `db:"app_type" json:"app_type"`
	LogoURL          *string         `db:"logo_url" json:"logo_url,omitempty"`
	HomepageURL      *string         `db:"homepage_url" json:"homepage_url,omitempty"`
	PrivacyURL       *string         `db:"privacy_url" json:"privacy_url,omitempty"`
	TosURL           *string         `db:"tos_url" json:"tos_url,omitempty"`
	Status           string          `db:"status" json:"status"`
	CreatedAt        time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time       `db:"updated_at" json:"updated_at"`
}

// DeveloperAppStore defines the interface for developer app management.
type DeveloperAppStore interface {
	Create(ctx context.Context, app *DeveloperApp, clientSecret string) error
	Get(ctx context.Context, tenantID, appID string) (*DeveloperApp, error)
	GetByClientID(ctx context.Context, clientID string) (*DeveloperApp, error)
	ListByOwner(ctx context.Context, tenantID, ownerID string) ([]DeveloperApp, error)
	Update(ctx context.Context, app *DeveloperApp) error
	Delete(ctx context.Context, tenantID, appID string) error
	RotateSecret(ctx context.Context, tenantID, appID string) (string, error)
	ValidateCredentials(ctx context.Context, clientID, clientSecret string) (*DeveloperApp, error)
}

type developerAppRepo struct {
	db *sqlx.DB
}

// NewDeveloperAppStore creates a new developer app store.
func NewDeveloperAppStore(db *sqlx.DB) DeveloperAppStore {
	return &developerAppRepo{db: db}
}

func generateClientID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "vv_" + hex.EncodeToString(b)
}

func generateClientSecret() string {
	b := make([]byte, 32)
	rand.Read(b)
	return "vvs_" + hex.EncodeToString(b)
}

func (r *developerAppRepo) Create(ctx context.Context, app *DeveloperApp, clientSecret string) error {
	app.ClientID = generateClientID()
	hash, err := bcrypt.GenerateFromPassword([]byte(clientSecret), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	app.ClientSecretHash = string(hash)

	if app.RedirectURIs == nil {
		app.RedirectURIs = json.RawMessage("[]")
	}
	if app.GrantTypes == nil {
		app.GrantTypes = json.RawMessage(`["authorization_code", "refresh_token"]`)
	}
	if app.Scopes == nil {
		app.Scopes = json.RawMessage(`["openid", "profile", "email"]`)
	}
	if app.AppType == "" {
		app.AppType = "web"
	}
	if app.Status == "" {
		app.Status = "active"
	}

	query := `
		INSERT INTO developer_apps (tenant_id, owner_id, name, description, client_id, client_secret_hash, 
		redirect_uris, grant_types, scopes, app_type, logo_url, homepage_url, privacy_url, tos_url, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowxContext(ctx, query,
		app.TenantID, app.OwnerID, app.Name, app.Description, app.ClientID, app.ClientSecretHash,
		app.RedirectURIs, app.GrantTypes, app.Scopes, app.AppType, app.LogoURL, app.HomepageURL,
		app.PrivacyURL, app.TosURL, app.Status,
	).Scan(&app.ID, &app.CreatedAt, &app.UpdatedAt)
}

func (r *developerAppRepo) Get(ctx context.Context, tenantID, appID string) (*DeveloperApp, error) {
	var app DeveloperApp
	query := `SELECT * FROM developer_apps WHERE tenant_id = $1 AND id = $2 AND status != 'deleted'`
	err := r.db.GetContext(ctx, &app, query, tenantID, appID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &app, nil
}

func (r *developerAppRepo) GetByClientID(ctx context.Context, clientID string) (*DeveloperApp, error) {
	var app DeveloperApp
	query := `SELECT * FROM developer_apps WHERE client_id = $1 AND status = 'active'`
	err := r.db.GetContext(ctx, &app, query, clientID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &app, nil
}

func (r *developerAppRepo) ListByOwner(ctx context.Context, tenantID, ownerID string) ([]DeveloperApp, error) {
	var apps []DeveloperApp
	query := `SELECT * FROM developer_apps WHERE tenant_id = $1 AND owner_id = $2 AND status != 'deleted' ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &apps, query, tenantID, ownerID)
	return apps, err
}

func (r *developerAppRepo) Update(ctx context.Context, app *DeveloperApp) error {
	query := `
		UPDATE developer_apps 
		SET name = $1, description = $2, redirect_uris = $3, logo_url = $4, 
		    homepage_url = $5, privacy_url = $6, tos_url = $7, updated_at = NOW()
		WHERE tenant_id = $8 AND id = $9
	`
	_, err := r.db.ExecContext(ctx, query,
		app.Name, app.Description, app.RedirectURIs, app.LogoURL,
		app.HomepageURL, app.PrivacyURL, app.TosURL, app.TenantID, app.ID,
	)
	return err
}

func (r *developerAppRepo) Delete(ctx context.Context, tenantID, appID string) error {
	query := `UPDATE developer_apps SET status = 'deleted', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, appID)
	return err
}

func (r *developerAppRepo) RotateSecret(ctx context.Context, tenantID, appID string) (string, error) {
	newSecret := generateClientSecret()
	hash, err := bcrypt.GenerateFromPassword([]byte(newSecret), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	query := `UPDATE developer_apps SET client_secret_hash = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3`
	_, err = r.db.ExecContext(ctx, query, string(hash), tenantID, appID)
	if err != nil {
		return "", err
	}
	return newSecret, nil
}

func (r *developerAppRepo) ValidateCredentials(ctx context.Context, clientID, clientSecret string) (*DeveloperApp, error) {
	app, err := r.GetByClientID(ctx, clientID)
	if err != nil || app == nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(app.ClientSecretHash), []byte(clientSecret)); err != nil {
		return nil, nil
	}
	return app, nil
}
