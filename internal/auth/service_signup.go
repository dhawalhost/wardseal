package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/dhawalhost/wardseal/internal/rbac"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	passwordpkg "github.com/dhawalhost/wardseal/pkg/password"
)

func (s *authService) SignUp(ctx context.Context, email, password, companyName, plan string) (string, string, string, error) {
	// 0. Check if Public Signup is allowed
	if s.deploymentMode != "saas" {
		return "", "", "", errors.New("public signup is disabled in this deployment mode")
	}

	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return "", "", "", errors.New("email and password are required")
	}
	if err := passwordpkg.ValidatePolicy(password); err != nil {
		return "", "", "", err
	}

	// 0.1 Check if email already exists globally
	respDisc, err := s.httpClient.Get(fmt.Sprintf("%s/internal/discover?email=%s", s.directoryServiceURL, url.QueryEscape(email)))
	if err == nil {
		defer func() { _ = respDisc.Body.Close() }()
		if respDisc.StatusCode == http.StatusOK {
			return "", "", "", errors.New("an account with this email already exists; please log in to your existing organization")
		}
	}

	// 1. Generate & Create Tenant in Directory Service (with retry for collisions)
	var tenantID string
	baseSlug := slugifyTenantName(companyName)
	tenantSlug := baseSlug
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		tenantID = generateShortID()
		if i == 0 {
			tenantSlug = baseSlug
		} else {
			suffix := tenantID
			if len(suffix) > 6 {
				suffix = suffix[:6]
			}
			tenantSlug = fmt.Sprintf("%s-%s", baseSlug, suffix)
		}

		tenantPayload := map[string]interface{}{
			"id":   tenantID,
			"name": companyName,
			"slug": tenantSlug,
			"plan": plan,
		}
		tenantBody, err := json.Marshal(tenantPayload)
		if err != nil {
			return "", "", "", err
		}

		reqTenant, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/internal/tenants", s.directoryServiceURL), bytes.NewReader(tenantBody))
		if err != nil {
			return "", "", "", err
		}
		reqTenant.Header.Set("Content-Type", "application/json")
		if s.serviceAuthToken != "" {
			reqTenant.Header.Set(s.serviceAuthHeader, s.serviceAuthToken)
		}

		respTenant, err := s.httpClient.Do(reqTenant)
		if err != nil {
			return "", "", "", fmt.Errorf("failed to create tenant: %w", err)
		}
		defer func() { _ = respTenant.Body.Close() }()

		if respTenant.StatusCode == http.StatusCreated {
			goto TenantCreated
		}

		if respTenant.StatusCode == http.StatusConflict && i < maxRetries-1 {
			// Collision! Retry with a new ID
			continue
		}

		return "", "", "", fmt.Errorf("directory service create tenant failed: status %d", respTenant.StatusCode)
	}

TenantCreated:

	// 3. Create User in Directory Service
	// We call POST /users directly on directory service URL, injecting the new Tenant ID header.
	// Payload must match CreateUserRequest: { "user": { ... } }
	userPayload := map[string]interface{}{
		"user": map[string]interface{}{
			"email":    email,
			"password": password,
			"status":   "active",
		},
	}
	body, err := json.Marshal(userPayload)
	if err != nil {
		return "", "", "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/users", s.directoryServiceURL), bytes.NewReader(body))
	if err != nil {
		return "", "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(middleware.DefaultTenantHeader, tenantID)
	if s.serviceAuthToken != "" {
		req.Header.Set(s.serviceAuthHeader, s.serviceAuthToken)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusCreated {
		// Try to read error body
		var errResp struct {
			Error string `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return "", "", "", fmt.Errorf("failed to create user: status %d, error: %s", resp.StatusCode, errResp.Error)
	}

	// 3. Login to get token
	// We call our own Login logic, but we need to pass the context with the new TenantID?
	// Login implementation derives TenantID from context using middleware.TenantIDFromContext.
	// We can't easily inject it into context for internal call without mocking middleware?
	// Actually, s.Login() reads context.
	// So we create a new context with tenantID.

	// Issue: middleware.TenantIDContextKey is unexported key type in middleware package.
	// We cannot set it from here using `context.WithValue` unless middleware exports the key or a setter.
	// Checking middleware/tenant.go... key IS unexported `type tenantContextKey string`.
	// BUT `TenantIDFromContext` reads it.
	// We can't inject it easily.

	// ALTERNATIVE: Use `s.privateKey` to mint token directly here without calling `Login`.
	// This is duplicate logic but cleaner than hacking context.

	// Read created user ID (response from POST /users includes it)
	var createUserResp struct {
		UserID string `json:"user_id"`
	}
	// We already decoded response? No.
	// Wait, I didn't decode success response above.
	// Need to re-read body if I didn't close it? `defer` closes at end of func.
	// Re-reading is fine if I decode it now.
	if err := json.NewDecoder(resp.Body).Decode(&createUserResp); err != nil {
		return "", "", "", fmt.Errorf("failed to decode create user response: %w", err)
	}

	if err := s.ensureTenantAdminRoleAssignment(ctx, tenantID, createUserResp.UserID); err != nil {
		return "", "", "", fmt.Errorf("failed to assign admin role: %w", err)
	}

	claims := jwt.MapClaims{
		"sub":    createUserResp.UserID,
		"iss":    "identity-platform",
		"aud":    "client-app",
		"exp":    time.Now().Add(time.Hour * 1).Unix(),
		"iat":    time.Now().Unix(),
		"scope":  "openid profile email",
		"tenant": tenantID,
		"roles":  []string{"super-admin"},
	}

	signedToken, err := s.signer.Sign(claims)
	if err != nil {
		return "", "", "", err
	}

	return signedToken, tenantID, tenantSlug, nil
}

func (s *authService) GetSystemSetupStatus(ctx context.Context) (bool, error) {
	// Check if any users exist in the system tenant
	// Resolve canonical system tenant slug to tenant ID when available; fallback to literal system tenant ID
	systemTenantID, err := s.ResolveTenantSlug(ctx, "admin")
	if err != nil {
		return false, fmt.Errorf("failed to resolve system tenant: %w", err)
	}
	if systemTenantID == "" {
		systemTenantID = "admin-system"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/users", s.directoryServiceURL), nil)
	if err != nil {
		return false, err
	}

	q := req.URL.Query()
	q.Add("limit", "1")
	req.URL.RawQuery = q.Encode()

	req.Header.Set("Content-Type", "application/json")
	// Use system tenant ID to check THAT tenant
	req.Header.Set(middleware.DefaultTenantHeader, systemTenantID)
	if s.serviceAuthToken != "" {
		req.Header.Set(s.serviceAuthHeader, s.serviceAuthToken)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("directory service returned status %d", resp.StatusCode)
	}

	var listResp struct {
		Total int `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return false, err
	}

	// Setup is required if total users == 0
	return listResp.Total == 0, nil
}

func (s *authService) PerformSystemSetup(ctx context.Context, email, password string) (string, error) {
	if err := passwordpkg.ValidatePolicy(password); err != nil {
		return "", err
	}
	// Double check that setup is allowed
	required, err := s.GetSystemSetupStatus(ctx)
	if err != nil {
		return "", err
	}
	if !required {
		return "", errors.New("system setup not required (or already completed)")
	}

	systemTenantID, err := s.ResolveTenantSlug(ctx, "admin")
	if err != nil {
		return "", fmt.Errorf("failed to resolve system tenant: %w", err)
	}
	if systemTenantID == "" {
		systemTenantID = "admin-system"
	}

	// Create the User in Directory Service
	userPayload := struct {
		User struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Status   string `json:"status"`
		} `json:"user"`
	}{
		User: struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Status   string `json:"status"`
		}{
			Email:    email,
			Password: password,
			Status:   "active",
		},
	}

	body, err := json.Marshal(userPayload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/users", s.directoryServiceURL), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(middleware.DefaultTenantHeader, systemTenantID)
	if s.serviceAuthToken != "" {
		req.Header.Set(s.serviceAuthHeader, s.serviceAuthToken)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create system owner: %s", string(respBody))
	}

	var createResp struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&createResp); err != nil {
		return "", err
	}

	if err := s.ensureTenantAdminRoleAssignment(ctx, systemTenantID, createResp.UserID); err != nil {
		return "", fmt.Errorf("failed to assign system admin role: %w", err)
	}

	// Sign a token for the new user
	claims := jwt.MapClaims{
		"sub":    createResp.UserID,
		"iss":    "identity-platform",
		"aud":    "admin-console",
		"exp":    time.Now().Add(time.Hour * 1).Unix(),
		"iat":    time.Now().Unix(),
		"scope":  "openid profile email",
		"tenant": systemTenantID,
		"roles":  []string{"super-admin"},
	}

	return s.signer.Sign(claims)
}

func (s *authService) ensureTenantAdminRoleAssignment(ctx context.Context, tenantID, userID string) error {
	if s.rbacStore == nil || tenantID == "" {
		return nil
	}

	type permDef struct {
		resource    string
		action      string
		description string
	}
	type roleDef struct {
		name        string
		description string
		perms       []string
	}

	defaultPerms := []permDef{
		{"*", "*", "Full administrative access to all resources"},
		{"users", "read", "Read user profiles"},
		{"users", "write", "Create and edit user profiles"},
		{"users", "delete", "Delete user profiles"},
		{"groups", "read", "Read access groups"},
		{"groups", "write", "Create and edit access groups"},
		{"groups", "delete", "Delete access groups"},
		{"roles", "read", "Read roles and permission mappings"},
		{"roles", "write", "Create and edit roles and permission mappings"},
		{"roles", "delete", "Delete roles"},
		{"policies", "read", "Read zero-trust access policies"},
		{"policies", "write", "Create and edit zero-trust access policies"},
		{"policies", "delete", "Delete zero-trust access policies"},
		{"audit", "read", "Read system audit logs"},
		{"applications", "read", "View application mappings"},
		{"applications", "write", "Create and edit application mappings"},
		{"applications", "delete", "Delete application mappings"},
	}

	defaultRoles := []roleDef{
		{"super-admin", "Full access to all system administrative tasks and configurations", []string{"*:*"}},
		{"security-admin", "Manage and configure security parameters and policies", []string{
			"users:read", "groups:read",
			"roles:read", "roles:write",
			"policies:read", "policies:write", "policies:delete",
			"audit:read",
			"applications:read", "applications:write", "applications:delete",
		}},
		{"user-admin", "Create, manage, and configure user profiles and access groups", []string{
			"users:read", "users:write", "users:delete", "groups:read", "groups:write", "groups:delete",
		}},
		{"standard-user", "Basic access privileges assigned to normal organizational members", []string{
			"applications:read",
		}},
	}

	permIDs := make(map[string]string)
	for _, pd := range defaultPerms {
		pid, err := s.rbacStore.CreatePermission(ctx, rbac.Permission{
			TenantID:    tenantID,
			Resource:    pd.resource,
			Action:      pd.action,
			Description: pd.description,
		})
		if err != nil {
			return fmt.Errorf("failed to seed permission %s:%s: %w", pd.resource, pd.action, err)
		}
		permIDs[fmt.Sprintf("%s:%s", pd.resource, pd.action)] = pid
	}

	var adminRoleID string
	for _, rd := range defaultRoles {
		rid, err := s.rbacStore.CreateRole(ctx, rbac.Role{
			TenantID:    tenantID,
			Name:        rd.name,
			Description: rd.description,
		})
		if err != nil {
			return fmt.Errorf("failed to seed role %s: %w", rd.name, err)
		}
		if rd.name == "super-admin" {
			adminRoleID = rid
		}

		for _, pkey := range rd.perms {
			if pid, ok := permIDs[pkey]; ok {
				_ = s.rbacStore.AssignPermissionToRole(ctx, rid, pid)
			}
		}
	}

	if adminRoleID != "" && userID != "" {
		return s.rbacStore.AssignRoleToUser(ctx, tenantID, userID, adminRoleID, nil)
	}

	return nil
}
func generateShortID() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 10)
	_, _ = rand.Read(b)
	result := make([]byte, len(b))
	for i := range b {
		result[i] = charset[int(b[i])%len(charset)]
	}
	return "ws-" + string(result)
}

func (s *authService) GeneratePasswordSetupToken(tenantID, userID, mode string, expiresHours int) (string, time.Time, error) {
	if tenantID == "" || userID == "" {
		return "", time.Time{}, fmt.Errorf("tenant and user are required")
	}
	if mode != "invite" && mode != "reset" {
		return "", time.Time{}, fmt.Errorf("invalid mode")
	}
	if expiresHours <= 0 {
		expiresHours = 72
	}
	if expiresHours > 168 {
		expiresHours = 168
	}

	now := time.Now()
	expiresAt := now.Add(time.Duration(expiresHours) * time.Hour)
	claims := jwt.MapClaims{
		"iss":     s.baseURL,
		"aud":     "wardseal-password-setup",
		"sub":     userID,
		"tenant":  tenantID,
		"purpose": "password_setup",
		"mode":    mode,
		"iat":     now.Unix(),
		"exp":     expiresAt.Unix(),
		"nbf":     now.Unix(),
	}

	token, err := s.signer.Sign(claims)
	if err != nil {
		return "", time.Time{}, err
	}

	return token, expiresAt, nil
}

func (s *authService) generatePasswordSetupToken(tenantID, userID, mode string, expiresHours int) (string, time.Time, error) {
	return s.GeneratePasswordSetupToken(tenantID, userID, mode, expiresHours)
}

func (s *authService) SetPasswordWithSetupToken(ctx context.Context, tokenString, password string) error {
	if err := passwordpkg.ValidatePolicy(password); err != nil {
		return err
	}

	revoked, err := s.revokedTokens.IsRevoked(ctx, tokenString)
	if err != nil {
		return fmt.Errorf("failed to validate setup token")
	}
	if revoked {
		return fmt.Errorf("setup token already used or revoked")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != s.signer.Algorithm() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.signer.PublicKey(), nil
	})
	if err != nil {
		return fmt.Errorf("invalid setup token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return fmt.Errorf("invalid setup token")
	}

	purpose, _ := claims["purpose"].(string)
	if purpose != "password_setup" {
		return fmt.Errorf("invalid setup token purpose")
	}

	tenantID, _ := claims["tenant"].(string)
	userID, _ := claims["sub"].(string)
	if tenantID == "" || userID == "" {
		return fmt.Errorf("invalid setup token claims")
	}

	if err := s.UpdateUserSelf(ctx, tenantID, userID, map[string]interface{}{"password": password}); err != nil {
		return err
	}

	if err := s.revokedTokens.Revoke(ctx, tokenString); err != nil {
		return fmt.Errorf("password updated but failed to revoke setup token")
	}

	return nil
}
