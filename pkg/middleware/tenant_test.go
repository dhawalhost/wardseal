package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

const testTenantUUID = "11111111-1111-1111-1111-111111111111"

func TestTenantExtractorSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(TenantExtractor(TenantConfig{}))
	r.GET("/ping", func(c *gin.Context) {
		tenantID, err := TenantIDFromGinContext(c)
		if err != nil {
			t.Fatalf("expected tenant id, got error: %v", err)
		}
		if tenantID != testTenantUUID {
			t.Fatalf("unexpected tenant id: %s", tenantID)
		}
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set(DefaultTenantHeader, testTenantUUID)
	res := httptest.NewRecorder()

	r.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
}

func TestTenantExtractorMissingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(TenantExtractor(TenantConfig{}))
	r.GET("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	res := httptest.NewRecorder()

	r.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", res.Code)
	}
}

func TestTenantExtractorInvalidUUID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(TenantExtractor(TenantConfig{}))
	r.GET("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set(DefaultTenantHeader, "invalid-tenant-id")
	res := httptest.NewRecorder()

	r.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid UUID, got %d", res.Code)
	}
}

func TestTenantIDFromContext(t *testing.T) {
	ctx := context.WithValue(context.Background(), tenantIDContextKey, testTenantUUID)
	tenantID, err := TenantIDFromContext(ctx)
	if err != nil {
		t.Fatalf("expected tenant id, got error: %v", err)
	}
	if tenantID != testTenantUUID {
		t.Fatalf("unexpected tenant id: %s", tenantID)
	}
}
