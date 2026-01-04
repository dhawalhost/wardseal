//go:build integration

package integration

import (
	"fmt"
	"net/http"
	"testing"
)

// TestGovernanceHealthCheck tests the governance service health endpoint.
func TestGovernanceHealthCheck(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)
	resp := client.Get(t, "/health")
	AssertStatus(t, resp, http.StatusOK)

	var result map[string]interface{}
	ReadJSON(t, resp, &result)
	if result["healthy"] != true {
		t.Errorf("Expected healthy=true, got %v", result["healthy"])
	}
}

// TestOAuthClientCRUD tests the full CRUD lifecycle for OAuth clients.
func TestOAuthClientCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// 1. Create OAuth Client
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"client_id":      "integration-test-client",
			"name":           "Integration Test Client",
			"client_type":    "public",
			"redirect_uris":  []string{"https://example.com/callback"},
			"allowed_scopes": []string{"openid", "profile"},
		}
		resp := client.Post(t, "/api/v1/oauth/clients", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		if created["client_id"] != "integration-test-client" {
			t.Errorf("Expected client_id=integration-test-client, got %v", created["client_id"])
		}
	})

	// 2. List OAuth Clients
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/oauth/clients")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		clients, ok := result["clients"].([]interface{})
		if !ok {
			t.Fatal("Expected clients array in response")
		}
		if len(clients) < 1 {
			t.Error("Expected at least one client")
		}
	})

	// 3. Get OAuth Client
	t.Run("Get", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/oauth/clients/integration-test-client")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if result["client_id"] != "integration-test-client" {
			t.Errorf("Expected client_id=integration-test-client, got %v", result["client_id"])
		}
	})

	// 4. Update OAuth Client
	t.Run("Update", func(t *testing.T) {
		updateReq := map[string]interface{}{
			"name":          "Updated Integration Test Client",
			"redirect_uris": []string{"https://example.com/callback", "https://example.com/callback2"},
		}
		resp := client.Put(t, "/api/v1/oauth/clients/integration-test-client", updateReq)
		AssertStatus(t, resp, http.StatusOK)

		var updated map[string]interface{}
		ReadJSON(t, resp, &updated)
		if updated["name"] != "Updated Integration Test Client" {
			t.Errorf("Expected updated name, got %v", updated["name"])
		}
	})

	// 5. Delete OAuth Client
	t.Run("Delete", func(t *testing.T) {
		resp := client.Delete(t, "/api/v1/oauth/clients/integration-test-client")
		AssertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		getResp := client.Get(t, "/api/v1/oauth/clients/integration-test-client")
		AssertStatus(t, getResp, http.StatusNotFound)
	})
}

// TestAccessRequestWorkflow tests the access request create/approve/reject flow.
func TestAccessRequestWorkflow(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Test creating and approving an access request
	t.Run("CreateAndApprove", func(t *testing.T) {
		// Create access request
		createReq := map[string]interface{}{
			"requester_id":  env.TestUserID,
			"resource_type": "application",
			"resource_id":   "app-123",
			"justification": "Need access for testing",
		}
		resp := client.Post(t, "/api/v1/governance/requests", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		requestID, ok := created["id"].(string)
		if !ok || requestID == "" {
			t.Fatal("Expected request ID in response")
		}

		// Approve the request
		approveResp := client.Post(t, fmt.Sprintf("/api/v1/governance/requests/%s/approve", requestID), map[string]interface{}{
			"comment": "Approved for testing",
		})
		AssertStatus(t, approveResp, http.StatusOK)
	})

	// Test creating and rejecting an access request
	t.Run("CreateAndReject", func(t *testing.T) {
		// Create access request
		createReq := map[string]interface{}{
			"requester_id":  env.TestUserID,
			"resource_type": "application",
			"resource_id":   "app-456",
			"justification": "Need access for testing",
		}
		resp := client.Post(t, "/api/v1/governance/requests", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		requestID, ok := created["id"].(string)
		if !ok || requestID == "" {
			t.Fatal("Expected request ID in response")
		}

		// Reject the request
		rejectResp := client.Post(t, fmt.Sprintf("/api/v1/governance/requests/%s/reject", requestID), map[string]interface{}{
			"comment": "Rejected for testing",
		})
		AssertStatus(t, rejectResp, http.StatusOK)
	})

	// Test listing access requests
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/governance/requests")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		requests, ok := result["requests"].([]interface{})
		if !ok {
			t.Fatal("Expected requests array in response")
		}
		if len(requests) < 2 {
			t.Errorf("Expected at least 2 requests, got %d", len(requests))
		}
	})
}

// TestOAuthClientValidation tests input validation for OAuth client creation.
func TestOAuthClientValidation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Test missing required fields
	t.Run("MissingClientID", func(t *testing.T) {
		createReq := map[string]interface{}{
			"name":          "Missing Client ID",
			"client_type":   "public",
			"redirect_uris": []string{"https://example.com/callback"},
		}
		resp := client.Post(t, "/api/v1/oauth/clients", createReq)
		AssertStatus(t, resp, http.StatusBadRequest)
	})

	// Test invalid redirect URI
	t.Run("InvalidRedirectURI", func(t *testing.T) {
		createReq := map[string]interface{}{
			"client_id":     "invalid-redirect-client",
			"name":          "Invalid Redirect Client",
			"client_type":   "public",
			"redirect_uris": []string{"not-a-valid-uri"},
		}
		resp := client.Post(t, "/api/v1/oauth/clients", createReq)
		AssertStatus(t, resp, http.StatusBadRequest)
	})
}
