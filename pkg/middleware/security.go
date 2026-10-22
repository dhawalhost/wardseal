package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds OWASP security headers to every response using gokit/middleware.SecureHeaders.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	secureHeaders := SecureHeaders()
	return func(c *gin.Context) {
		secureHeaders(c)
		// UI kits require unsafe-inline styles:
		c.Writer.Header().Set("Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
	}
}
