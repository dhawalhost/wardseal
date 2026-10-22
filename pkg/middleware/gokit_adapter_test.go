package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	gokiterrors "github.com/dhawalhost/gokit/errors"
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
