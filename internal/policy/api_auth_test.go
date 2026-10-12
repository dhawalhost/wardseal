package policy

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/middleware"
)

type stubPolicyService struct{}

func (s *stubPolicyService) CreatePolicy(context.Context, Policy) (string, error) { return "p1", nil }
func (s *stubPolicyService) GetPolicy(context.Context, string, string) (Policy, error) {
	return Policy{}, nil
}
func (s *stubPolicyService) ListPolicies(context.Context, string) ([]Policy, error) {
	return nil, nil
}
func (s *stubPolicyService) UpdatePolicy(context.Context, Policy) error { return nil }
func (s *stubPolicyService) DeletePolicy(context.Context, string, string) error {
	return nil
}
func (s *stubPolicyService) HealthCheck(context.Context) (bool, error) { return true, nil }
func (s *stubPolicyService) Evaluate(context.Context, Input) (bool, string, error) {
	return true, "", nil
}

func TestPolicyRoutesRequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHTTPHandler(&stubPolicyService{}, zap.NewNop())
	r := gin.New()

	api := r.Group("/api/v1")
	api.Use(middleware.TenantExtractor(middleware.TenantConfig{}))
	api.Use(middleware.RequireUserAuth(func(string) (*middleware.Claims, error) {
		return nil, http.ErrNoCookie
	}))
	h.RegisterAPIRoutes(api)

	tenant := "11111111-1111-1111-1111-111111111111"
	req := httptest.NewRequest(http.MethodGet, "/api/v1/policies", nil)
	req.Header.Set("X-Tenant-ID", tenant)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without JWT, got %d", resp.Code)
	}
}

func TestPolicyHealthPublic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHTTPHandler(&stubPolicyService{}, zap.NewNop())
	r := gin.New()
	r.GET("/health", h.HealthCheck)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.Code)
	}
}
