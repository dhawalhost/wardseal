package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dhawalhost/gokit/bulkhead"
	"github.com/dhawalhost/gokit/compression"
	gokiterrors "github.com/dhawalhost/gokit/errors"
	"github.com/dhawalhost/gokit/loadshed"
	gokitserver "github.com/dhawalhost/gokit/server"
	"github.com/gin-gonic/gin"
)

func TestGokitAdapter_AbortWithAppError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/error-test", func(c *gin.Context) {
		AbortWithAppError(c, gokiterrors.NotFound("RESOURCE_NOT_FOUND", "the requested item was not found"))
	})

	req := httptest.NewRequest(http.MethodGet, "/error-test", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rec.Code)
	}

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}
}

func TestGokitAdapter_SecureHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SecureHeaders())

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("expected X-Content-Type-Options nosniff, got %s", rec.Header().Get("X-Content-Type-Options"))
	}
	if rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("expected X-Frame-Options DENY, got %s", rec.Header().Get("X-Frame-Options"))
	}
}

func TestRequireUserAuthWithContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	calledWithContext := false
	router.Use(RequireUserAuthWithContext(func(ctx context.Context, token string) (*Claims, error) {
		if ctx != nil {
			calledWithContext = true
		}
		c := &Claims{}
		c.Subject = "user-123"
		return c, nil
	}))

	router.GET("/me", func(c *gin.Context) {
		c.String(http.StatusOK, c.GetString("user_id"))
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !calledWithContext {
		t.Errorf("expected validator to be called with context")
	}
	if rec.Body.String() != "user-123" {
		t.Errorf("expected user-123, got %s", rec.Body.String())
	}
}

func TestGokitServerMount(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ginRouter := gin.New()
	ginRouter.GET("/api/v1/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	srv := gokitserver.New()
	srv.Mount("/", ginRouter)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 from mounted router, got %d", rec.Code)
	}
}

func TestGokitIdempotency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(Idempotency())

	callCount := 0
	router.POST("/mutate", func(c *gin.Context) {
		callCount++
		c.JSON(http.StatusCreated, gin.H{"count": callCount})
	})

	// 1. Initial Request
	req1 := httptest.NewRequest(http.MethodPost, "/mutate", strings.NewReader(`{"action":"grant"}`))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Idempotency-Key", "key-abc-123")
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)

	if rec1.Code != http.StatusCreated {
		t.Fatalf("expected 201 on first request, got %d: %s", rec1.Code, rec1.Body.String())
	}
	if callCount != 1 {
		t.Fatalf("expected callCount 1, got %d", callCount)
	}

	// 2. Replayed Request with exact same key and payload
	req2 := httptest.NewRequest(http.MethodPost, "/mutate", strings.NewReader(`{"action":"grant"}`))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Idempotency-Key", "key-abc-123")
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusCreated {
		t.Fatalf("expected 201 on replayed request, got %d", rec2.Code)
	}
	if rec2.Header().Get("Idempotent-Replayed") != "true" {
		t.Errorf("expected Idempotent-Replayed header to be true")
	}
	if callCount != 1 {
		t.Errorf("handler should not have executed again on replayed request, callCount=%d", callCount)
	}
}

func TestParsePagination(t *testing.T) {
	tests := []struct {
		name           string
		rawURL         string
		expectedLimit  int
		expectedOffset int
		expectedCursor string
	}{
		{
			name:           "default values when empty",
			rawURL:         "/api/v1/items",
			expectedLimit:  20,
			expectedOffset: 0,
			expectedCursor: "",
		},
		{
			name:           "explicit limit and offset",
			rawURL:         "/api/v1/items?limit=50&offset=150",
			expectedLimit:  50,
			expectedOffset: 150,
			expectedCursor: "",
		},
		{
			name:           "page and page_size conversion to offset",
			rawURL:         "/api/v1/items?page=3&page_size=25",
			expectedLimit:  20, // default limit since limit wasn't in cursor params
			expectedOffset: 50, // (3 - 1) * 25
			expectedCursor: "",
		},
		{
			name:           "cursor and limit",
			rawURL:         "/api/v1/items?cursor=cur_xyz789&limit=30",
			expectedLimit:  30,
			expectedOffset: 0,
			expectedCursor: "cur_xyz789",
		},
		{
			name:           "limit bounding above 100 clamps to default 20",
			rawURL:         "/api/v1/items?limit=999",
			expectedLimit:  20,
			expectedOffset: 0,
			expectedCursor: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.rawURL, nil)
			limit, offset, cursor := ParsePagination(req)
			if limit != tc.expectedLimit {
				t.Errorf("limit: expected %d, got %d", tc.expectedLimit, limit)
			}
			if offset != tc.expectedOffset {
				t.Errorf("offset: expected %d, got %d", tc.expectedOffset, offset)
			}
			if cursor != tc.expectedCursor {
				t.Errorf("cursor: expected %q, got %q", tc.expectedCursor, cursor)
			}
		})
	}
}

func TestGokitAdapter_LoadShed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	limiter := loadshed.NewLimiter()
	router := gin.New()
	router.Use(LoadShed(limiter))
	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestGokitAdapter_Bulkhead(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pb := bulkhead.NewPartitionedBulkhead(bulkhead.Config{
		MaxConcurrent: 1,
		MaxQueue:      0,
	})
	router := gin.New()
	router.Use(Bulkhead(pb, func(r *http.Request) string {
		return r.Header.Get("X-Tenant-ID")
	}))
	router.GET("/heavy", func(c *gin.Context) {
		c.String(http.StatusOK, "done")
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/heavy", nil)
	req.Header.Set("X-Tenant-ID", "tenant-1")
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestGokitAdapter_HealthCheckers(t *testing.T) {
	ctx := context.Background()
	checker := GORMHealthChecker(nil)
	err := checker.HealthCheck(ctx)
	if err == nil {
		t.Errorf("expected error for nil gorm db, got nil")
	}

	sqlChecker := SQLHealthChecker(nil)
	err = sqlChecker.HealthCheck(ctx)
	if err == nil {
		t.Errorf("expected error for nil sql db, got nil")
	}
}

func TestGokitAdapter_Compression(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(Compression(
		compression.WithMinLength(50),
	))

	payload := strings.Repeat("Enterprise Identity Platform WardSeal Secure Data ", 10)
	router.GET("/data", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json", []byte(payload))
	})

	// 1. Request with Accept-Encoding: gzip
	req := httptest.NewRequest(http.MethodGet, "/data", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	enc := rec.Header().Get("Content-Encoding")
	if enc != "gzip" {
		t.Errorf("expected Content-Encoding gzip, got %s", enc)
	}

	decompressed, err := compression.DecompressBytes(compression.EncodingGzip, rec.Body.Bytes())
	if err != nil {
		t.Fatalf("failed to decompress response: %v", err)
	}
	if string(decompressed) != payload {
		t.Errorf("decompressed content mismatch")
	}
}

