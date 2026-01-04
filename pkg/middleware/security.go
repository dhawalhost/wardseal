package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware adds common security headers to every response.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		// Deny framing to prevent clickjacking
		c.Writer.Header().Set("X-Frame-Options", "DENY")

		// Enable XSS protection (for older browsers)
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		// Basic Content Security Policy (CSP)
		// This is a strict starting point; adjust as needed for React/Vite.
		// We allow 'self' and inline styles/scripts often needed by dev tools.
		// In production, this should be tighter.
		c.Writer.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:")

		c.Next()
	}
}
