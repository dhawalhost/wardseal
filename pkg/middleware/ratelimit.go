package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// IPRateLimiter manages rate limiters for each IP address.
type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

// NewIPRateLimiter creates a new rate limiter.
// r is the rate of events (requests per second).
// b is the burst size (max concurrent requests).
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	i := &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}

	// Simple cleanup routine (in production use a better cache like Redis)
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			i.mu.Lock()
			// This is a naive cleanup. A better approach tracks last seen time.
			// For now, we just reset the map to prevent unbounded growth in dev.
			// In production, use Redis with TTL.
			if len(i.ips) > 10000 {
				i.ips = make(map[string]*rate.Limiter)
			}
			i.mu.Unlock()
		}
	}()

	return i
}

// GetLimiter returns the rate limiter for the given IP.
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.r, i.b)
		i.ips[ip] = limiter
	}

	return limiter
}

// RateLimitMiddleware creates a Gin middleware for rate limiting.
func RateLimitMiddleware(limit rate.Limit, burst int) gin.HandlerFunc {
	limiter := NewIPRateLimiter(limit, burst)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.GetLimiter(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests",
			})
			return
		}
		c.Next()
	}
}
