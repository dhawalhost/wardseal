//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestWebhookCRUD tests the full CRUD lifecycle for webhooks.
func TestWebhookCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)
	var createdWebhookID string

	// 1. Create Webhook
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"url":    "https://webhook.example.com/events",
			"events": []string{"user.created", "user.updated", "user.deleted"},
			"secret": "webhook-secret-key",
		}
		resp := client.Post(t, "/api/v1/webhooks", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected webhook ID in response")
		}
		createdWebhookID = id
	})

	// 2. List Webhooks
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/webhooks")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		webhooks, ok := result["webhooks"].([]interface{})
		if !ok {
			t.Fatal("Expected webhooks array in response")
		}
		if len(webhooks) < 1 {
			t.Error("Expected at least one webhook")
		}
	})

	// 3. Get Webhook
	t.Run("Get", func(t *testing.T) {
		if createdWebhookID == "" {
			t.Skip("No webhook ID from create step")
		}
		resp := client.Get(t, "/api/v1/webhooks/"+createdWebhookID)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 4. Delete Webhook
	t.Run("Delete", func(t *testing.T) {
		if createdWebhookID == "" {
			t.Skip("No webhook ID from create step")
		}
		resp := client.Delete(t, "/api/v1/webhooks/"+createdWebhookID)
		AssertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		getResp := client.Get(t, "/api/v1/webhooks/"+createdWebhookID)
		if getResp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected 404 after deletion, got %d", getResp.StatusCode)
		}
	})
}

// TestWebhookValidation tests webhook input validation.
func TestWebhookValidation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Test missing URL
	t.Run("MissingURL", func(t *testing.T) {
		createReq := map[string]interface{}{
			"events": []string{"user.created"},
			"secret": "secret",
		}
		resp := client.Post(t, "/api/v1/webhooks", createReq)
		AssertStatus(t, resp, http.StatusBadRequest)
	})

	// Test invalid URL
	t.Run("InvalidURL", func(t *testing.T) {
		createReq := map[string]interface{}{
			"url":    "not-a-valid-url",
			"events": []string{"user.created"},
			"secret": "secret",
		}
		resp := client.Post(t, "/api/v1/webhooks", createReq)
		// Should fail validation
		if resp.StatusCode == http.StatusCreated {
			t.Error("Expected error for invalid URL")
		}
	})
}

// TestOrganizationCRUD tests organization management endpoints.
func TestOrganizationCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)
	var createdOrgID string

	// 1. Create Organization
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"name":        "Test Organization",
			"domain":      "testorg.example.com",
			"description": "A test organization",
		}
		resp := client.Post(t, "/api/v1/organizations", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected organization ID in response")
		}
		createdOrgID = id
	})

	// 2. List Organizations
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/organizations")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if _, ok := result["organizations"]; !ok {
			t.Fatal("Expected organizations array in response")
		}
	})

	// 3. Get Organization
	t.Run("Get", func(t *testing.T) {
		if createdOrgID == "" {
			t.Skip("No organization ID from create step")
		}
		resp := client.Get(t, "/api/v1/organizations/"+createdOrgID)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 4. Update Organization
	t.Run("Update", func(t *testing.T) {
		if createdOrgID == "" {
			t.Skip("No organization ID from create step")
		}
		updateReq := map[string]interface{}{
			"name":        "Updated Test Organization",
			"description": "Updated description",
		}
		resp := client.Put(t, "/api/v1/organizations/"+createdOrgID, updateReq)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 5. Delete Organization
	t.Run("Delete", func(t *testing.T) {
		if createdOrgID == "" {
			t.Skip("No organization ID from create step")
		}
		resp := client.Delete(t, "/api/v1/organizations/"+createdOrgID)
		AssertStatus(t, resp, http.StatusNoContent)
	})
}
