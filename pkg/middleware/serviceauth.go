package middleware

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// DefaultServiceAuthHeader is the header name used to transmit the internal service token.
const DefaultServiceAuthHeader = "X-Service-Auth"

// DevServiceAuthToken is the local-only fallback when SERVICE_AUTH_TOKEN is unset.
const DevServiceAuthToken = "dev-internal-token"

// ServiceAuthConfig controls how the service authentication middleware behaves.
type ServiceAuthConfig struct {
	HeaderName string
	Token      string
}

// ResolveServiceAuthToken returns the configured token, or a development fallback.
// Staging and production refuse to start with an empty token.
func ResolveServiceAuthToken(env, token string) (string, error) {
	if strings.TrimSpace(token) != "" {
		return token, nil
	}
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "staging", "production":
		return "", fmt.Errorf("SERVICE_AUTH_TOKEN is required in %s", env)
	default:
		return DevServiceAuthToken, nil
	}
}

// ServiceAuthenticator ensures that only trusted services can access protected routes.
func ServiceAuthenticator(cfg ServiceAuthConfig) gin.HandlerFunc {
	headerName := cfg.HeaderName
	if headerName == "" {
		headerName = DefaultServiceAuthHeader
	}

	expected := []byte(cfg.Token)

	return func(c *gin.Context) {
		provided := c.GetHeader(headerName)
		if len(expected) == 0 || provided == "" || subtle.ConstantTimeCompare([]byte(provided), expected) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid service token"})
			return
		}
		c.Next()
	}
}
