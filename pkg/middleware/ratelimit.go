package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/dhawalhost/gokit/ratelimit"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// IPRateLimiter manages rate limiters for each IP address backed by gokit/ratelimit.
type IPRateLimiter struct {
	store ratelimit.Store
	r     rate.Limit
	b     int
}

// NewIPRateLimiter creates a new rate limiter backed by gokit/ratelimit.InMemoryStore
// with automatic TTL-based cleanup of inactive keys.
// r is the rate of events (requests per second).
// b is the burst size (max concurrent requests).
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	return NewIPRateLimiterWithStore(ratelimit.NewInMemoryStoreWithTTL(1*time.Hour), r, b)
}

// NewIPRateLimiterWithStore creates a rate limiter with a custom ratelimit.Store (e.g. Redis or custom TTL).
func NewIPRateLimiterWithStore(store ratelimit.Store, r rate.Limit, b int) *IPRateLimiter {
	return &IPRateLimiter{
		store: store,
		r:     r,
		b:     b,
	}
}

// Allow reports whether a request for the given key is permitted under the limiter rate and burst.
func (i *IPRateLimiter) Allow(key string) bool {
	allowed, err := i.store.Allow(context.Background(), key, float64(i.r), i.b)
	if err != nil {
		return false
	}
	return allowed
}

// GetLimiter is preserved for backwards compatibility with callers expecting a *rate.Limiter.
func (i *IPRateLimiter) GetLimiter(_ string) *rate.Limiter {
	return rate.NewLimiter(i.r, i.b)
}

// RateLimitMiddleware creates a Gin middleware for rate limiting.
func RateLimitMiddleware(limit rate.Limit, burst int) gin.HandlerFunc {
	limiter := NewIPRateLimiter(limit, burst)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.Allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests",
			})
			return
		}
		c.Next()
	}
}
