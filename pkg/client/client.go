package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Client is a client for the Identity Platform API.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
	Token      string
	TenantID   string
}

// Config holds configuration for the client.
type Config struct {
	BaseURL  string
	TenantID string
	Timeout  time.Duration
}

// New creates a new Client.
func New(cfg Config) *Client {
	if cfg.Timeout == 0 {
		cfg.Timeout = 10 * time.Second
	}
	return &Client{
		BaseURL:  cfg.BaseURL,
		TenantID: cfg.TenantID,
		HTTPClient: &http.Client{
			Timeout: cfg.Timeout,
		},
	}
}

// SetToken sets the authentication token for subsequent requests.
func (c *Client) SetToken(token string) {
	c.Token = token
}

// Login performs username/password authentication and stores the token.
func (c *Client) Login(ctx context.Context, username, password string) error {
	payload := map[string]string{
		"username": username,
		"password": password,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/login", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.TenantID != "" {
		req.Header.Set("X-Tenant-ID", c.TenantID)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("login failed: %s", string(body))
	}

	var res struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	c.Token = res.Token
	return nil
}

// doRequest helper to perform authenticated requests.
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}, out interface{}) error {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewBuffer(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, bodyReader)
	if err != nil {
		return err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
	if c.TenantID != "" {
		req.Header.Set("X-Tenant-ID", c.TenantID)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	if out != nil && resp.StatusCode != http.StatusNoContent {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return err
		}
	}

	return nil
}

// SCIM User represents a simplified SCIM user for the SDK.
type ScimUser struct {
	ID       string `json:"id"`
	UserName string `json:"userName"`
	Active   bool   `json:"active"`
}

// ListUsers lists users (SCIM).
func (c *Client) ListUsers(ctx context.Context, filter string) ([]ScimUser, error) {
	path := "/scim/v2/Users"
	if filter != "" {
		path += "?filter=" + url.QueryEscape(filter)
	}

	// Simplify response parsing for demo
	var res struct {
		Resources []ScimUser `json:"Resources"`
	}
	if err := c.doRequest(ctx, "GET", path, nil, &res); err != nil {
		return nil, err
	}
	return res.Resources, nil
}
