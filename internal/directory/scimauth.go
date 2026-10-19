package directory

import (
	"context"
	"crypto/rsa"
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	jwtlib "github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/dhawalhost/wardseal/pkg/config"
	"github.com/dhawalhost/wardseal/pkg/middleware"
)

var (
	jwtPublicKey     *rsa.PublicKey
	jwtPublicKeyOnce sync.Once
)

var scimAdminRoles = map[string]struct{}{
	"super-admin":    {},
	"security-admin": {},
	"user-admin":     {},
}

func loadPublicKey(log *zap.Logger) {
	jwtPublicKeyOnce.Do(func() {
		keyPath := os.Getenv("APP_AUTH_JWT_PUBLIC_KEY_PATH")
		if keyPath == "" {
			cfgFile := os.Getenv("APP_CONFIG")
			if cfgFile == "" {
				cfgFile = os.Getenv("CONFIG_FILE")
			}
			cfg, err := config.Load(cfgFile)
			if err == nil {
				keyPath = cfg.Auth.JWTPublicKeyPath
			}
		}

		if keyPath == "" {
			keyPath = "/etc/wardseal/keys/jwt.pub"
			if _, err := os.Stat(keyPath); err != nil {
				keyPath = "deploy/dev-keys/jwt.pub"
			}
		}

		log.Info("SCIM loading JWT public key", zap.String("path", keyPath))
		keyBytes, err := os.ReadFile(keyPath) //nolint:gosec // G304: path from trusted config/env
		if err != nil {
			log.Warn("Failed to read JWT public key file for SCIM auth", zap.String("path", keyPath), zap.Error(err))
			return
		}
		pubKey, err := jwtlib.ParseRSAPublicKeyFromPEM(keyBytes)
		if err != nil {
			log.Error("Failed to parse JWT public key for SCIM auth", zap.Error(err))
			return
		}
		jwtPublicKey = pubKey
	})
}

func jwtClaimString(claims jwtlib.MapClaims, keys ...string) string {
	for _, key := range keys {
		if tid, ok := claims[key].(string); ok && tid != "" {
			return tid
		}
	}
	return ""
}

func jwtClaimRoles(claims jwtlib.MapClaims) []string {
	raw, ok := claims["roles"]
	if !ok {
		return nil
	}
	switch v := raw.(type) {
	case []string:
		return v
	case []interface{}:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func hasSCIMAdminRole(roles []string) bool {
	for _, role := range roles {
		if _, ok := scimAdminRoles[role]; ok {
			return true
		}
	}
	return false
}

func jwtClaimScopes(claims jwtlib.MapClaims) []string {
	raw, ok := claims["scope"]
	if !ok {
		raw, ok = claims["scopes"]
	}
	if !ok {
		return nil
	}
	switch v := raw.(type) {
	case string:
		return strings.Fields(v)
	case []string:
		return v
	case []interface{}:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func hasSCIMScope(scopes []string) bool {
	for _, s := range scopes {
		switch strings.ToLower(strings.TrimSpace(s)) {
		case "scim", "*", "admin":
			return true
		}
	}
	return false
}

func apiKeyHasSCIMScope(scopes []string) bool {
	if len(scopes) == 0 {
		// Legacy keys without scopes are not SCIM-capable.
		return false
	}
	return hasSCIMScope(scopes)
}

func scimUnauthorized(c *gin.Context, detail string) {
	c.JSON(http.StatusUnauthorized, gin.H{
		"schemas": []string{"urn:ietf:params:scim:api:messages:2.0:Error"},
		"status":  "401",
		"detail":  detail,
	})
	c.Abort()
}

func scimForbidden(c *gin.Context, detail string) {
	c.JSON(http.StatusForbidden, gin.H{
		"schemas": []string{"urn:ietf:params:scim:api:messages:2.0:Error"},
		"status":  "403",
		"detail":  detail,
	})
	c.Abort()
}

// RequireSCIMBearerToken authenticates SCIM requests via:
//  1. Internal service token (+ X-Tenant-ID)
//  2. RSA JWT with admin role (+ optional scim scope) and tenant claim
//  3. SCIM API key with scim scope (tenant from key record)
//
// Browser console sessions send wardseal_access_token (httpOnly); accept that
// the same way RequireUserAuth does when Authorization is absent.
func RequireSCIMBearerToken(repo Repository, log *zap.Logger, internalServiceToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			if cookie, err := c.Cookie("wardseal_access_token"); err == nil && cookie != "" {
				authHeader = "Bearer " + cookie
			}
		}

		if authHeader == "" {
			scimUnauthorized(c, "Authorization header is missing")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			scimUnauthorized(c, "Authorization header must be a Bearer token")
			return
		}

		token := parts[1]

		// 1. Internal service token (constant-time)
		if internalServiceToken != "" &&
			subtle.ConstantTimeCompare([]byte(token), []byte(internalServiceToken)) == 1 {
			tenantID := c.GetHeader("X-Tenant-ID")
			if tenantID == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"schemas": []string{"urn:ietf:params:scim:api:messages:2.0:Error"},
					"status":  "400",
					"detail":  "X-Tenant-ID is required for internal service token usage",
				})
				c.Abort()
				return
			}
			ctx := middleware.InjectTenantID(c.Request.Context(), tenantID)
			c.Request = c.Request.WithContext(ctx)
			c.Next()
			return
		}

		// 2. Admin JWT (tenant from claims only)
		if strings.Count(token, ".") == 2 {
			loadPublicKey(log)
			if jwtPublicKey != nil {
				claims := jwtlib.MapClaims{}
				parsedToken, err := jwtlib.ParseWithClaims(token, claims, func(t *jwtlib.Token) (interface{}, error) {
					if _, ok := t.Method.(*jwtlib.SigningMethodRSA); !ok {
						return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
					}
					return jwtPublicKey, nil
				})

				if err == nil && parsedToken.Valid {
					jwtTenantID := jwtClaimString(claims, "tenant_id", "tenant", "tid")
					if jwtTenantID == "" {
						scimForbidden(c, "tenant claim required")
						return
					}
					// Admin JWT (portal session or OAuth): role gates access.
					// scim scope is enforced for API keys only (path 3 below).
					if !hasSCIMAdminRole(jwtClaimRoles(claims)) {
						scimForbidden(c, "insufficient privileges for SCIM")
						return
					}
					ctx := middleware.InjectTenantID(c.Request.Context(), jwtTenantID)
					c.Request = c.Request.WithContext(ctx)
					c.Next()
					return
				} else if err != nil {
					log.Warn("SCIM JWT verification failed", zap.Error(err))
				}
			} else {
				log.Warn("SCIM JWT verification skipped: public key not loaded")
			}
		}

		// 3. API keys
		if len(token) < 16 {
			scimUnauthorized(c, "Invalid API Key format")
			return
		}

		prefix := token[:16] + "..."

		candidates, err := repo.GetAPIKeyByPrefix(c.Request.Context(), prefix)
		if err != nil {
			log.Error("Failed to query API keys", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error during authentication"})
			c.Abort()
			return
		}

		var matchedTenantID string
		var matchedKeyID string
		var matchedScopes []string
		isValid := false

		for _, candidate := range candidates {
			if err := bcrypt.CompareHashAndPassword([]byte(candidate.KeyHash), []byte(token)); err == nil {
				isValid = true
				matchedTenantID = candidate.TenantID
				matchedKeyID = candidate.ID
				matchedScopes = candidate.ScopeList()
				break
			}
		}

		if !isValid {
			scimUnauthorized(c, "Invalid or revoked API Key")
			return
		}
		if !apiKeyHasSCIMScope(matchedScopes) {
			scimForbidden(c, "API key missing scim scope")
			return
		}

		go func(kid, tid string) {
			_ = repo.UpdateAPIKeyLastUsed(context.Background(), kid, tid)
		}(matchedKeyID, matchedTenantID)

		ctx := middleware.InjectTenantID(c.Request.Context(), matchedTenantID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
