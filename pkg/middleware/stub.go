package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/dhawalhost/wardseal/pkg/types"
	"github.com/golang-jwt/jwt/v5"
)

const (
	TenantContextKey = "tenant_id"
	UserContextKey   = "user_id"

	DefaultTenantHeader      = "X-Tenant-ID"
	DefaultServiceAuthHeader = "X-Service-Token"
)

type Claims struct {
	jwt.RegisteredClaims
	Subject string
	Roles   []string
}

// Chi/net/http compatible middleware

type TenantConfig struct {
	HeaderName    string
	AllowFallback bool
	SlugResolver  func(ctx context.Context, slug string) (string, error)
}

func TenantExtractor(cfg TenantConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headerName := cfg.HeaderName
			if headerName == "" {
				headerName = "X-Tenant-ID"
			}

			// Try header first
			tenantID := r.Header.Get(headerName)
			if tenantID == "" {
				// Try slug if provided in query or header
				slug := r.Header.Get("X-Tenant-Slug")
				if slug == "" {
					slug = r.URL.Query().Get("tenant")
				}
				if slug != "" && cfg.SlugResolver != nil {
					var err error
					tenantID, err = cfg.SlugResolver(r.Context(), slug)
					if err != nil {
						// For now just continue
					}
				}
			}

			if tenantID != "" {
				ctx := context.WithValue(r.Context(), TenantContextKey, tenantID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			if !cfg.AllowFallback {
				// We could return 400 here, but usually we let the handler decide
			}
			next.ServeHTTP(w, r)
		})
	}
}

func InjectTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, TenantContextKey, tenantID)
}

func TenantIDFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	id, ok := ctx.Value(TenantContextKey).(string)
	return id, ok && id != ""
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	id, ok := ctx.Value(UserContextKey).(string)
	return id, ok && id != ""
}

func RequireUserAuth(validator func(token string) (*Claims, error)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			token := ""
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = authHeader[7:]
			}
			if token == "" {
				c, err := r.Cookie("wardseal_access_token")
				if err == nil {
					token = c.Value
				}
			}

			if token == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			claims, err := validator(token)
			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type ServiceAuthConfig struct {
	HeaderName string
	Token      types.Secret
}

func ServiceAuthenticator(cfg ServiceAuthConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headerName := cfg.HeaderName
			if headerName == "" {
				headerName = "X-Service-Token"
			}
			token := r.Header.Get(headerName)
			if token == "" || token != cfg.Token.Raw() {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
