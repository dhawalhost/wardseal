package saml

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"net/url"
	"time"

	saml2 "github.com/crewjam/saml"
	"github.com/crewjam/saml/samlidp"
	"github.com/jmoiron/sqlx"
)

// Store implements samlidp.Store interface.
type Store struct {
	db                  *sqlx.DB
	samlidp.MemoryStore // We inherit this for methods we don't fully override yet, like Session
}

// NewStore creates a new SAML Store.
func NewStore(db *sqlx.DB) *Store {
	return &Store{
		db:          db,
		MemoryStore: samlidp.MemoryStore{},
	}
}

// ServiceProvider represents a configured SP (Database Model).
type ServiceProvider struct {
	EntityID      string    `db:"entity_id"`
	TenantID      string    `db:"tenant_id"`
	MetadataURL   string    `db:"metadata_url"`
	ACSURL        string    `db:"acs_url"`
	Certificate   string    `db:"certificate"`
	CreatedAt     time.Time `db:"created_at"`
	UpdatedAt     time.Time `db:"updated_at"`
	EncryptionKey *rsa.PrivateKey
}

// GetServiceProvider retrieves a service provider by EntityID.
func (s *Store) GetServiceProvider(ctx context.Context, entityID string) (*saml2.ServiceProvider, error) {
	var sp ServiceProvider
	err := s.db.GetContext(ctx, &sp, "SELECT * FROM saml_providers WHERE entity_id = $1", entityID)
	if err != nil {
		return nil, err
	}

	cert, err := parseCert(sp.Certificate)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	acsURL := parseURL(sp.ACSURL)
	metadataURL := parseURL(sp.MetadataURL)

	return &saml2.ServiceProvider{
		EntityID:    sp.EntityID,
		MetadataURL: metadataURL,
		AcsURL:      acsURL,
		Certificate: cert,
		// EncryptionKey: sp.EncryptionKey,
		// Metadata field removed as it seems it's not present in this version or optional
	}, nil
}

// Helper functions
func parseCert(pemStr string) (*x509.Certificate, error) {
	if pemStr == "" {
		return nil, nil
	}
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}
	return x509.ParseCertificate(block.Bytes)
}

func parseURL(u string) url.URL {
	parser, _ := url.Parse(u)
	if parser == nil {
		return url.URL{}
	}
	return *parser
}
