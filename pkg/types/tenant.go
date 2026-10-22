package types

import (
	"context"
	"errors"
)

// DefaultTenantHeader is the HTTP header used to carry the tenant identifier when no
// custom header name is provided.
const DefaultTenantHeader = "X-Tenant-ID"

// DefaultServiceAuthHeader is the HTTP header used to transmit internal service tokens.
const DefaultServiceAuthHeader = "X-Service-Auth"

// ErrTenantNotFound indicates that no tenant ID was found in the context.
var ErrTenantNotFound = errors.New("tenant id not found in context")

type TenantContextKeyType string

// TenantIDContextKey is the context key used for storing and retrieving tenant IDs.
const TenantIDContextKey TenantContextKeyType = "wardseal.tenantID"

// TenantContextKeyString returns the raw string identifier for the tenant context key.
func TenantContextKeyString() string {
	return string(TenantIDContextKey)
}

// TenantIDFromContext extracts the tenant identifier from a standard context.
func TenantIDFromContext(ctx context.Context) (string, error) {
	if ctx == nil {
		return "", ErrTenantNotFound
	}
	if value := ctx.Value(TenantIDContextKey); value != nil {
		if tenantID, ok := value.(string); ok && tenantID != "" {
			return tenantID, nil
		}
	}
	return "", ErrTenantNotFound
}

// InjectTenantID injects the tenant identifier into a standard context.
func InjectTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, TenantIDContextKey, tenantID)
}
