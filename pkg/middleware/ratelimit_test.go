package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func TestRateLimitMiddleware(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	limit := rate.Limit(10) // 10 requests per second
	burst := 1
	r := gin.New()
	r.Use(RateLimitMiddleware(limit, burst))
	r.GET("/", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Test 1: Allowed request
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", w.Code)
	}

	// Test 2: Rate limit exceeded (burst is 1, so immediate second request might fail or succeed depending on timing, but let's try to exceed)
	// Actually, with burst 1, the first request consumes the token. Refill is 10/s = 1 token every 100ms.
	// Immediate second request should fail.
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/", nil)
	r.ServeHTTP(w2, req2)

	// Note: In extremely fast execution, this might fail.
	// But let's verify if we get 429.
	if w2.Code != http.StatusTooManyRequests {
		// It might have allowed it if implementation is loose or refill happened.
		// Let's force it by sending many.
		for i := 0; i < 5; i++ {
			wLoop := httptest.NewRecorder()
			r.ServeHTTP(wLoop, req2)
			if wLoop.Code == http.StatusTooManyRequests {
				return // Success
			}
		}
		t.Errorf("Expected 429 Too Many Requests eventually, but got all OK")
	}
}
