package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/middleware"
)

func TestDeveloperAPIRejectsHeaderOnlyAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &DeveloperAPIHandler{logger: zap.NewNop()}
	r := gin.New()

	api := r.Group("/api/v1")
	api.Use(middleware.TenantExtractor(middleware.TenantConfig{}))
	api.Use(middleware.RequireUserAuth(func(string) (*middleware.Claims, error) {
		return nil, http.ErrNoCookie
	}))
	h.RegisterRoutes(api)

	tenant := "11111111-1111-1111-1111-111111111111"
	req := httptest.NewRequest(http.MethodGet, "/api/v1/apps", nil)
	req.Header.Set("X-Tenant-ID", tenant)
	req.Header.Set("X-User-ID", "attacker")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 when only spoofable headers are sent, got %d", resp.Code)
	}
}

func TestRBACRoutesRejectUnauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	api := r.Group("/api/v1")
	api.Use(middleware.TenantExtractor(middleware.TenantConfig{}))
	api.Use(middleware.RequireUserAuth(func(string) (*middleware.Claims, error) {
		return nil, http.ErrNoCookie
	}))
	api.GET("/roles", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	tenant := "11111111-1111-1111-1111-111111111111"
	req := httptest.NewRequest(http.MethodGet, "/api/v1/roles", nil)
	req.Header.Set("X-Tenant-ID", tenant)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.Code)
	}
}
