package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var (
	// SQL Injection patterns.
	// Avoid bare `--` / `/*` — they false-positive on base64url JWT bodies (e.g. MFA pending_token).
	sqliRegex = regexp.MustCompile(`(?i)('|\b)(UNION\b\s+SELECT\b|SELECT\b.+\bFROM\b|INSERT\b\s+INTO\b|DELETE\b\s+FROM\b|DROP\b\s+TABLE\b|UPDATE\b\s+\w+\s+SET\b|OR\b\s+\d+\s*=\s*\d+)`)

	// XSS patterns
	xssRegex = regexp.MustCompile(`(?i)(<script\b|javascript:|on\w+\s*=)`)

	// Path traversal and remote code execution / JNDI probe patterns
	probeRegex = regexp.MustCompile(`(?i)(\.\./\.\./|%2e%2e%2f|%2e%2e/|\$\{jndi:(?:ldap|rmi|dns)://)`)
)

// SoftwareWAFMiddleware provides Layer 7 protection against common injection attacks, XSS, and probe attempts.
func SoftwareWAFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check Query Parameters (RawQuery, unescaped raw query, keys, and values)
		if rawQuery := c.Request.URL.RawQuery; rawQuery != "" {
			if detectThreat(rawQuery) {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
				return
			}
			if unescaped, err := url.QueryUnescape(rawQuery); err == nil && detectThreat(unescaped) {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
				return
			}
		}
		for key, values := range c.Request.URL.Query() {
			if detectThreat(key) {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
				return
			}
			for _, val := range values {
				if detectThreat(val) {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
					return
				}
			}
		}

		// 2. Check Headers (e.g., X-Forwarded-For, User-Agent, Referer)
		for key, values := range c.Request.Header {
			// Only check specific headers to avoid false positives on auth tokens
			if strings.HasPrefix(key, "X-") || key == "User-Agent" || key == "Referer" {
				for _, val := range values {
					if detectThreat(val) {
						c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
						return
					}
				}
			}
		}

		// 3. Check Request Body (safely buffered up to 1MB, handles chunked encoding)
		if c.Request.Body != nil {
			const maxScanBody = 1024 * 1024 // 1 MB scan window
			bodyBytes, err := io.ReadAll(io.LimitReader(c.Request.Body, maxScanBody))
			if err == nil && len(bodyBytes) > 0 {
				// Restore body for subsequent handlers
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				if detectThreat(string(bodyBytes)) {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "malicious payload detected"})
					return
				}
			}
		}

		c.Next()
	}
}

func detectThreat(input string) bool {
	if sqliRegex.MatchString(input) {
		return true
	}
	if xssRegex.MatchString(input) {
		return true
	}
	if probeRegex.MatchString(input) {
		return true
	}
	return false
}
