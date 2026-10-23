package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type stubPerms struct {
	allow bool
	err   error
}

func (s stubPerms) HasPermission(context.Context, string, string, string, string) (bool, error) {
	return s.allow, s.err
}

func TestRequirePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tenant := "11111111-1111-1111-1111-111111111111"

	newRouter := func(checker PermissionChecker) *gin.Engine {
		r := gin.New()
		r.GET("/x", func(c *gin.Context) {
			c.Set(string(tenantIDContextKey), tenant)
			ctx := context.WithValue(c.Request.Context(), tenantIDContextKey, tenant)
			c.Request = c.Request.WithContext(ctx)
			c.Set("user_id", "user-1")
			c.Next()
		}, RequirePermission(checker, "applications", "write"), func(c *gin.Context) {
			c.Status(http.StatusOK)
		})
		return r
	}

	t.Run("forbidden", func(t *testing.T) {
		resp := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		newRouter(stubPerms{allow: false}).ServeHTTP(resp, req)
		if resp.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", resp.Code)
		}
	})

	t.Run("allowed", func(t *testing.T) {
		resp := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		newRouter(stubPerms{allow: true}).ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.Code)
		}
	})
}
