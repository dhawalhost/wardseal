package directory

import (
	"crypto/rand"
	"crypto/rsa"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	jwtlib "github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

func signTestJWT(t *testing.T, key *rsa.PrivateKey, claims jwtlib.MapClaims) string {
	t.Helper()
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodRS256, claims)
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

func TestSCIMRejectsNonAdminJWT(t *testing.T) {
	gin.SetMode(gin.TestMode)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwtPublicKey = &key.PublicKey
	jwtPublicKeyOnce.Do(func() {})

	r := gin.New()
	r.Use(RequireSCIMBearerToken(nil, zap.NewNop(), "svc-token"))
	r.GET("/scim/v2/Users", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signTestJWT(t, key, jwtlib.MapClaims{
		"sub":    "user-1",
		"tenant": "11111111-1111-1111-1111-111111111111",
		"roles":  []string{"standard-user"},
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/scim/v2/Users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Tenant-ID", "22222222-2222-2222-2222-222222222222")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-admin JWT, got %d body=%s", resp.Code, resp.Body.String())
	}
}

func TestSCIMRejectsJWTWithoutTenantClaimEvenWithHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwtPublicKey = &key.PublicKey

	r := gin.New()
	r.Use(RequireSCIMBearerToken(nil, zap.NewNop(), "svc-token"))
	r.GET("/scim/v2/Users", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signTestJWT(t, key, jwtlib.MapClaims{
		"sub":   "admin-1",
		"roles": []string{"super-admin"},
		"exp":   time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/scim/v2/Users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Tenant-ID", "11111111-1111-1111-1111-111111111111")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when tenant claim missing, got %d body=%s", resp.Code, resp.Body.String())
	}
}

func TestSCIMAllowsAdminJWT(t *testing.T) {
	gin.SetMode(gin.TestMode)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwtPublicKey = &key.PublicKey

	r := gin.New()
	r.Use(RequireSCIMBearerToken(nil, zap.NewNop(), "svc-token"))
	r.GET("/scim/v2/Users", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signTestJWT(t, key, jwtlib.MapClaims{
		"sub":    "admin-1",
		"tenant": "11111111-1111-1111-1111-111111111111",
		"roles":  []string{"super-admin"},
		"scope":  "openid scim",
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/scim/v2/Users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected 200 for admin JWT, got %d body=%s", resp.Code, resp.Body.String())
	}
}

func TestSCIMAllowsAdminJWTWithoutSCIMScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwtPublicKey = &key.PublicKey

	r := gin.New()
	r.Use(RequireSCIMBearerToken(nil, zap.NewNop(), "svc-token"))
	r.GET("/scim/v2/Users", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signTestJWT(t, key, jwtlib.MapClaims{
		"sub":    "admin-1",
		"tenant": "11111111-1111-1111-1111-111111111111",
		"roles":  []string{"super-admin"},
		"scope":  "openid profile",
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/scim/v2/Users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected 200 for admin JWT without scim scope, got %d", resp.Code)
	}
}

func TestSCIMAllowsSessionCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwtPublicKey = &key.PublicKey

	r := gin.New()
	r.Use(RequireSCIMBearerToken(nil, zap.NewNop(), "svc-token"))
	r.GET("/scim/v2/Users", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signTestJWT(t, key, jwtlib.MapClaims{
		"sub":    "admin-1",
		"tenant": "11111111-1111-1111-1111-111111111111",
		"roles":  []string{"super-admin"},
		"scope":  "openid profile email",
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/scim/v2/Users", nil)
	req.AddCookie(&http.Cookie{Name: "wardseal_access_token", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteStrictMode})
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected 200 when session cookie present, got %d body=%s", resp.Code, resp.Body.String())
	}
}
