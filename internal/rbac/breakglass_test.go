package rbac

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/middleware"
)

type denyPerms struct{}

func (denyPerms) HasPermission(context.Context, string, string, string, string) (bool, error) {
	return false, nil
}

type stubBreakGlassSvc struct {
	elevated bool
}

func (s *stubBreakGlassSvc) CreateRole(context.Context, string, string, string) (Role, error) {
	return Role{}, nil
}
func (s *stubBreakGlassSvc) GetRole(context.Context, string, string) (Role, error) {
	return Role{}, nil
}
func (s *stubBreakGlassSvc) ListRoles(context.Context, string) ([]Role, error) {
	return []Role{{ID: "role-1", Name: "super-admin"}}, nil
}
func (s *stubBreakGlassSvc) UpdateRole(context.Context, string, string, string, string) (Role, error) {
	return Role{}, nil
}
func (s *stubBreakGlassSvc) DeleteRole(context.Context, string, string) error { return nil }
func (s *stubBreakGlassSvc) CreatePermission(context.Context, string, string, string, string) (Permission, error) {
	return Permission{}, nil
}
func (s *stubBreakGlassSvc) ListPermissions(context.Context, string) ([]Permission, error) {
	return nil, nil
}
func (s *stubBreakGlassSvc) AssignPermissionToRole(context.Context, string, string) error { return nil }
func (s *stubBreakGlassSvc) RemovePermissionFromRole(context.Context, string, string) error {
	return nil
}
func (s *stubBreakGlassSvc) GetRolePermissions(context.Context, string) ([]Permission, error) {
	return nil, nil
}
func (s *stubBreakGlassSvc) AssignRoleToUser(context.Context, string, string, string, *string) error {
	return nil
}
func (s *stubBreakGlassSvc) AssignRoleWithExpiration(context.Context, string, string, string, *string, string) error {
	s.elevated = true
	return nil
}
func (s *stubBreakGlassSvc) RemoveRoleFromUser(context.Context, string, string) error { return nil }
func (s *stubBreakGlassSvc) GetUserRoles(context.Context, string, string) ([]Role, error) {
	return nil, nil
}
func (s *stubBreakGlassSvc) GetUserPermissions(context.Context, string, string) ([]Permission, error) {
	return nil, nil
}
func (s *stubBreakGlassSvc) ListExpiredAssignments(context.Context) ([]UserRole, error) {
	return nil, nil
}
func (s *stubBreakGlassSvc) HasPermission(context.Context, string, string, string, string) (bool, error) {
	return false, nil
}

func TestBreakGlassRequiresRolesWrite(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &stubBreakGlassSvc{}
	h := NewHTTPHandler(svc, zap.NewNop())

	r := gin.New()
	g := r.Group("/api/v1")
	g.Use(func(c *gin.Context) {
		c.Set("user_id", "actor-1")
		c.Set("wardseal.tenantID", "11111111-1111-1111-1111-111111111111")
		c.Next()
	})
	h.RegisterBreakGlassRoutes(g, denyPerms{})

	body := `{"user_id":"target-1","reason":"IR drill quarterly","duration":"15m"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/break-glass/elevate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without roles:write, got %d body=%s", resp.Code, resp.Body.String())
	}
	if svc.elevated {
		t.Fatal("elevation must not run without permission")
	}
}

func TestBreakGlassRejectsOverlongDuration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &stubBreakGlassSvc{}
	h := NewHTTPHandler(svc, zap.NewNop())

	allow := stubAllowPerms{}
	r := gin.New()
	g := r.Group("/api/v1")
	g.Use(func(c *gin.Context) {
		c.Set("user_id", "actor-1")
		c.Set("wardseal.tenantID", "11111111-1111-1111-1111-111111111111")
		c.Next()
	})
	h.RegisterBreakGlassRoutes(g, allow)

	body := `{"user_id":"target-1","reason":"IR drill quarterly","duration":"24h"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/break-glass/elevate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for duration > 8h, got %d", resp.Code)
	}
	if svc.elevated {
		t.Fatal("must not elevate with invalid duration")
	}
}

type stubAllowPerms struct{}

func (stubAllowPerms) HasPermission(context.Context, string, string, string, string) (bool, error) {
	return true, nil
}

// Ensure middleware import used when compiling with older stubs.
var _ middleware.PermissionChecker = denyPerms{}
