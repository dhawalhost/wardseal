package license

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// LicenseClaims defines the custom claims in a license token.
type LicenseClaims struct {
	jwt.RegisteredClaims
	Features []string `json:"features,omitempty"`
	Plan     string   `json:"plan,omitempty"` // e.g., "enterprise", "starter"
}

// License represents a parsed and verified license.
type License struct {
	CustomerName string
	ExpiresAt    time.Time
	Features     []string
	Plan         string
}

// Manager handles license verification.
type Manager struct {
	publicKey *rsa.PublicKey
}

// NewManager creates a new license manager with the given public key (PEM format).
func NewManager(publicKeyPEM []byte) (*Manager, error) {
	block, _ := pem.Decode(publicKeyPEM)
	if block == nil {
		return nil, errors.New("failed to parse public key PEM")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("public key is not RSA")
	}

	return &Manager{publicKey: rsaPub}, nil
}

// Verify parses and verifies a license key (JWT).
func (m *Manager) Verify(tokenString string) (*License, error) {
	token, err := jwt.ParseWithClaims(tokenString, &LicenseClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid license: %w", err)
	}

	if claims, ok := token.Claims.(*LicenseClaims); ok && token.Valid {
		// Check expiry
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			return nil, errors.New("license expired")
		}

		return &License{
			CustomerName: claims.Subject,
			ExpiresAt:    claims.ExpiresAt.Time,
			Features:     claims.Features,
			Plan:         claims.Plan,
		}, nil
	}

	return nil, errors.New("invalid license claims")
}
