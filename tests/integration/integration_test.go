//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	kitconfig "github.com/dhawalhost/gokit/config"
	"github.com/dhawalhost/gokit/database"
	"github.com/dhawalhost/wardseal/internal/audit"
	"github.com/dhawalhost/wardseal/internal/auth"
	"github.com/dhawalhost/wardseal/internal/connector"
	"github.com/dhawalhost/wardseal/internal/directory"
	"github.com/dhawalhost/wardseal/internal/governance"
	"github.com/dhawalhost/wardseal/internal/oauthclient"
	"github.com/dhawalhost/wardseal/internal/policy"
	"github.com/dhawalhost/wardseal/internal/rbac"
	"github.com/dhawalhost/wardseal/internal/saml"
	"github.com/dhawalhost/wardseal/internal/scim"
	"github.com/dhawalhost/wardseal/internal/sso"
	"github.com/dhawalhost/wardseal/internal/webhook"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TestEnv holds the test environment configuration.
type TestEnv struct {
	DB            *gorm.DB
	AuthServer    *httptest.Server
	DirServer     *httptest.Server
	GovServer     *httptest.Server
	Logger        *zap.Logger
	TestTenantID  string
	TestUserID    string
	TestUserEmail string
}

// SetupTestEnv creates a new test environment with real database connections.
func SetupTestEnv(t *testing.T) *TestEnv {
	t.Helper()

	logger, _ := zap.NewDevelopment()

	dbHost := os.Getenv("TEST_DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}

	dbConfig := kitconfig.DatabaseConfig{
		DSN: fmt.Sprintf("host=%s port=5432 user=%s password=%s dbname=%s sslmode=disable",
			dbHost,
			envOr("TEST_DB_USER", "postgres"),
			envOr("TEST_DB_PASSWORD", "postgres"),
			envOr("TEST_DB_NAME", "wardseal_test"),
		),
	}

	dbConn, err := database.New(context.Background(), dbConfig)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	env := &TestEnv{
		DB:            dbConn.GORM,
		Logger:        logger,
		TestTenantID:  "11111111-1111-1111-1111-111111111111",
		TestUserEmail: "test@wardseal.com",
	}

	env.setupTestData(t)
	env.setupServers(t)

	return env
}

// Teardown cleans up the test environment.
func (env *TestEnv) Teardown(t *testing.T) {
	t.Helper()
	env.cleanupTestData(t)
	if env.AuthServer != nil {
		env.AuthServer.Close()
	}
	if env.DirServer != nil {
		env.DirServer.Close()
	}
	if env.GovServer != nil {
		env.GovServer.Close()
	}
}

func (env *TestEnv) setupTestData(t *testing.T) {
	t.Helper()

	// Create test tenant
	err := env.DB.Exec(`
		INSERT INTO tenants (id, name, created_at, updated_at)
		VALUES (?, 'Test Tenant', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, env.TestTenantID).Error
	if err != nil {
		t.Fatalf("Failed to create test tenant: %v", err)
	}

	// Create test user
	var userID string
	err = env.DB.Raw(`
		INSERT INTO identities (tenant_id, status, created_at, updated_at)
		VALUES (?, 'active', NOW(), NOW())
		ON CONFLICT DO NOTHING
		RETURNING id
	`, env.TestTenantID).Scan(&userID).Error
	if err != nil || userID == "" {
		// User might already exist, try to fetch
		err = env.DB.Raw(`
			SELECT id FROM identities WHERE tenant_id = ? LIMIT 1
		`, env.TestTenantID).Scan(&userID).Error
		if err != nil {
			t.Fatalf("Failed to create or fetch test user: %v", err)
		}
	}
	env.TestUserID = userID

	// Create account for the user
	err = env.DB.Exec(`
		INSERT INTO accounts (identity_id, tenant_id, login, password_hash)
		VALUES (?, ?, ?, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
		ON CONFLICT (tenant_id, login) DO NOTHING
	`, userID, env.TestTenantID, env.TestUserEmail).Error
	if err != nil {
		t.Logf("Note: account creation skipped (may already exist): %v", err)
	}

	// Create test OAuth client
	err = env.DB.Exec(`
		INSERT INTO oauth_clients (tenant_id, client_id, client_type, name, redirect_uris, allowed_scopes)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT (tenant_id, client_id) DO NOTHING
	`, env.TestTenantID, "test-client", "public", "Test Client", "{https://app.wardseal.com/callback}", "{openid,profile,email}").Error
	if err != nil {
		t.Fatalf("Failed to create test OAuth client: %v", err)
	}
}

func (env *TestEnv) cleanupTestData(t *testing.T) {
	t.Helper()

	// Clean up in reverse order of dependencies
	env.DB.Exec(`DELETE FROM certification_items WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM certification_campaigns WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM user_roles WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM permissions WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM roles WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM sso_providers WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM webhooks WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM connectors WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM accounts WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM identities WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM oauth_clients WHERE tenant_id = ?`, env.TestTenantID)
	env.DB.Exec(`DELETE FROM access_requests WHERE tenant_id = ?`, env.TestTenantID)
}

func (env *TestEnv) setupServers(t *testing.T) {
	t.Helper()

	// Setup Directory Service
	dirRepo := directory.NewRepository(env.DB)
	dirSvc := directory.NewService(dirRepo)
	dirHandler := directory.NewHTTPHandler(dirSvc, env.Logger, directory.HTTPHandlerConfig{
		ServiceAuthHeader: "X-Internal-Service-Auth",
		ServiceAuthToken:  "test-service-token",
	})

	scimSvc := scim.NewService(dirSvc)
	scimHandler := scim.NewHTTPHandler(scimSvc, dirRepo, "test-service-token", env.Logger)

	dirRouter := chi.NewRouter()
	dirRouter.Mount("/api/v1/directory", dirHandler.Router())
	dirRouter.Mount("/scim/v2", scimHandler.Router())
	env.DirServer = httptest.NewServer(dirRouter)

	// Setup Governance Service
	clientStore := oauthclient.NewRepository(env.DB)
	reqStore := governance.NewRepository(env.DB)
	orgRepo := governance.NewOrganizationRepository(env.DB)
	dirClient := governance.NewDirectoryClient(env.DirServer.URL, "", "")
	policyEngine := policy.NewSimpleEngine()

	govSvc := governance.NewService(clientStore, reqStore, orgRepo, dirClient, policyEngine)
	campaignSvc := governance.NewCampaignService(governance.NewCampaignRepository(env.DB), dirClient)
	webhookSvc := webhook.NewService(env.DB)

	govHandler := governance.NewHTTPHandler(govSvc, campaignSvc, webhookSvc, env.Logger)
	govRouter := chi.NewRouter()
	govRouter.Mount("/api/v1/governance", govHandler.Router())

	// Additional handlers for Governance Service
	rbacRepo := rbac.NewRepository(env.DB)
	rbacSvc := rbac.NewService(rbacRepo)
	rbacHandler := rbac.NewHTTPHandler(rbacSvc, env.Logger)
	govRouter.Mount("/api/v1/rbac", rbacHandler.Router())

	ssoRepo := sso.NewRepository(env.DB)
	ssoSvc := sso.NewService(ssoRepo)
	ssoHandler := sso.NewHTTPHandler(ssoSvc, env.Logger)
	govRouter.Mount("/api/v1/sso", ssoHandler.Router())

	auditRepo := audit.NewRepository(env.DB)
	auditSvc := audit.NewService(auditRepo)
	auditHandler := audit.NewHTTPHandler(auditSvc, env.Logger)
	govRouter.Mount("/api/v1/audit", auditHandler.Router())

	connectorRepo := connector.NewRepository(env.DB)
	connectorRegistry := connector.NewRegistry()
	connectorSvc := connector.NewService(connectorRepo, connectorRegistry)
	connectorHandler := connector.NewHTTPHandler(connectorSvc, env.Logger)
	govRouter.Mount("/api/v1/connectors", connectorHandler.Router())

	env.GovServer = httptest.NewServer(govRouter)

	// Setup Auth Service
	samlStore := saml.NewStore(nil)
	loginAttemptStore := auth.NewLoginAttemptRepository(env.DB)
	appStore := auth.NewDeveloperAppRepository(env.DB)

	authSvc, err := auth.NewService(auth.Config{
		BaseURL:             "http://localhost:8080",
		DirectoryServiceURL: env.DirServer.URL,
		SAMLStore:           samlStore,
		ClientStore:         clientStore,
		WebAuthnStore:       auth.NewWebAuthnRepository(env.DB),
		TOTPStore:           auth.NewTOTPRepository(env.DB),
		SSOProviderStore:    auth.NewSSOProviderRepository(env.DB),
		BrandingStore:       auth.NewBrandingRepository(env.DB),
		FederationStore:     auth.NewFederationRepository(env.DB),
		AppStore:            appStore,
		RBACStore:           rbacRepo,
		IPPolicyStore:       auth.NewIPPolicyRepository(env.DB),
		TenantStore:         auth.NewTenantRepository(env.DB),
	})
	if err != nil {
		t.Fatalf("Failed to create auth service: %v", err)
	}
	authHandler := auth.NewHTTPHandler(authSvc, env.Logger, loginAttemptStore, appStore)
	env.AuthServer = httptest.NewServer(authHandler.Router())
}

// HTTPClient provides helper methods for making HTTP requests in tests.
type HTTPClient struct {
	BaseURL  string
	TenantID string
	client   *http.Client
}

// NewHTTPClient creates a new HTTP client for testing.
func NewHTTPClient(baseURL, tenantID string) *HTTPClient {
	return &HTTPClient{
		BaseURL:  baseURL,
		TenantID: tenantID,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Get performs a GET request.
func (c *HTTPClient) Get(t *testing.T, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, c.BaseURL+path, nil)
	if err != nil {
		t.Fatalf("Failed to create GET request: %v", err)
	}
	req.Header.Set("X-Tenant-ID", c.TenantID)
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatalf("GET request failed: %v", err)
	}
	return resp
}

// Post performs a POST request with JSON body.
func (c *HTTPClient) Post(t *testing.T, path string, body interface{}) *http.Response {
	t.Helper()
	var jsonBody []byte
	var err error
	if body != nil {
		jsonBody, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("Failed to marshal request body: %v", err)
		}
	}
	req, err := http.NewRequest(http.MethodPost, c.BaseURL+path, bytes.NewBuffer(jsonBody))
	if err != nil {
		t.Fatalf("Failed to create POST request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", c.TenantID)
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatalf("POST request failed: %v", err)
	}
	return resp
}

// Put performs a PUT request with JSON body.
func (c *HTTPClient) Put(t *testing.T, path string, body interface{}) *http.Response {
	t.Helper()
	jsonBody, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("Failed to marshal request body: %v", err)
	}
	req, err := http.NewRequest(http.MethodPut, c.BaseURL+path, bytes.NewBuffer(jsonBody))
	if err != nil {
		t.Fatalf("Failed to create PUT request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", c.TenantID)
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatalf("PUT request failed: %v", err)
	}
	return resp
}

// Delete performs a DELETE request.
func (c *HTTPClient) Delete(t *testing.T, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, c.BaseURL+path, nil)
	if err != nil {
		t.Fatalf("Failed to create DELETE request: %v", err)
	}
	req.Header.Set("X-Tenant-ID", c.TenantID)
	resp, err := c.client.Do(req)
	if err != nil {
		t.Fatalf("DELETE request failed: %v", err)
	}
	return resp
}

// ReadJSON reads the response body as JSON into the provided struct.
func ReadJSON(t *testing.T, resp *http.Response, v interface{}) {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	if err := json.Unmarshal(body, v); err != nil {
		t.Fatalf("Failed to unmarshal response: %v\nBody: %s", err, string(body))
	}
}

// AssertStatus checks if the response has the expected status code.
func AssertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status %d, got %d. Body: %s", expected, resp.StatusCode, string(body))
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func mustJSON(v interface{}) io.Reader {
	b, _ := json.Marshal(v)
	return bytes.NewReader(b)
}
