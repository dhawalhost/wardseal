package governance

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/dhawalhost/gokit/circuitbreaker"
	gokitclient "github.com/dhawalhost/gokit/client"
)

// DirectoryClient provides methods to interact with the Directory Service.
type DirectoryClient interface {
	// User mapping
	GetUserByID(ctx context.Context, tenantID, userID string) (User, error)
	AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error
	RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error
	ResolveTenantSlug(ctx context.Context, slug string) (string, error)

	// Organization mapping
	AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error
	RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error
	ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error)

	// List methods
	ListUsers(ctx context.Context, tenantID string) ([]User, error)
	ListGroups(ctx context.Context, tenantID string) ([]Group, error)
}

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type Group struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type directoryHTTPClient struct {
	baseURL    string
	client     *gokitclient.Client
	authHeader string
	authToken  string
}

// NewDirectoryClient creates a new resilient client for the Directory Service using gokit/client.
func NewDirectoryClient(baseURL, authHeader, authToken string) DirectoryClient {
	cb := circuitbreaker.New(circuitbreaker.Config{
		Name:             "directory-service",
		MaxFailures:      5,
		ResetTimeout:     30 * time.Second,
		ExecutionTimeout: 5 * time.Second,
	})

	c := gokitclient.New(
		gokitclient.WithBaseURL(baseURL),
		gokitclient.WithTimeout(5*time.Second),
		gokitclient.WithCircuitBreaker(cb),
		gokitclient.WithMaxRetries(2),
		gokitclient.WithTracePropagation(true),
		gokitclient.WithRequestIDPropagation(true),
	)

	return &directoryHTTPClient{
		baseURL:    baseURL,
		client:     c,
		authHeader: authHeader,
		authToken:  authToken,
	}
}

func (c *directoryHTTPClient) do(req *http.Request) (*http.Response, error) {
	if c.authToken != "" {
		req.Header.Set(c.authHeader, c.authToken)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to dirsvc failed: %w", err)
	}
	return resp, nil
}

func (c *directoryHTTPClient) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	url := fmt.Sprintf("%s/groups/%s/users", c.baseURL, groupID)
	body, _ := json.Marshal(map[string]string{"user_id": userID})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	return nil
}

func (c *directoryHTTPClient) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	url := fmt.Sprintf("%s/groups/%s/users/%s", c.baseURL, groupID, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	return nil
}

func (c *directoryHTTPClient) ResolveTenantSlug(ctx context.Context, slug string) (string, error) {
	url := fmt.Sprintf("%s/internal/tenants/resolve?slug=%s", c.baseURL, slug)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil // Not found
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}

	var res struct {
		TenantID string `json:"tenant_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}
	return res.TenantID, nil
}

func (c *directoryHTTPClient) AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error {
	url := fmt.Sprintf("%s/users/%s/organizations/%s", c.baseURL, userID, orgID)
	body, _ := json.Marshal(map[string]string{"role": role})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	return nil
}

func (c *directoryHTTPClient) RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error {
	url := fmt.Sprintf("%s/users/%s/organizations/%s", c.baseURL, userID, orgID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	return nil
}

func (c *directoryHTTPClient) ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error) {
	url := fmt.Sprintf("%s/users/%s/organizations", c.baseURL, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	var res struct {
		OrganizationIDs []string `json:"organization_ids"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return res.OrganizationIDs, nil
}

func (c *directoryHTTPClient) GetUserByID(ctx context.Context, tenantID, userID string) (User, error) {
	url := fmt.Sprintf("%s/users/%s", c.baseURL, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return User{}, err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return User{}, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return User{}, fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return User{}, err
	}
	return user, nil
}

func (c *directoryHTTPClient) ListUsers(ctx context.Context, tenantID string) ([]User, error) {
	url := fmt.Sprintf("%s/users", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	var res struct {
		Users []User `json:"users"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return res.Users, nil
}

func (c *directoryHTTPClient) ListGroups(ctx context.Context, tenantID string) ([]Group, error) {
	url := fmt.Sprintf("%s/groups", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := c.do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dirsvc returned status %d", resp.StatusCode)
	}
	var res struct {
		Groups []Group `json:"groups"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return res.Groups, nil
}
