//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestConnectorCRUD tests the full CRUD lifecycle for connectors.
func TestConnectorCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)
	var createdConnectorID string

	// 1. Create Connector
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"name":    "Test SCIM Connector",
			"type":    "scim",
			"enabled": false,
			"config": map[string]interface{}{
				"base_url": "https://api.example.com/scim/v2",
				"token":    "test-bearer-token",
			},
		}
		resp := client.Post(t, "/api/v1/connectors", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected connector ID in response")
		}
		createdConnectorID = id
	})

	// 2. List Connectors
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/connectors")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		connectors, ok := result["connectors"].([]interface{})
		if !ok {
			t.Fatal("Expected connectors array in response")
		}
		if len(connectors) < 1 {
			t.Error("Expected at least one connector")
		}
	})

	// 3. Get Connector
	t.Run("Get", func(t *testing.T) {
		if createdConnectorID == "" {
			t.Skip("No connector ID from create step")
		}
		resp := client.Get(t, "/api/v1/connectors/"+createdConnectorID)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 4. Update Connector
	t.Run("Update", func(t *testing.T) {
		if createdConnectorID == "" {
			t.Skip("No connector ID from create step")
		}
		updateReq := map[string]interface{}{
			"name":    "Updated SCIM Connector",
			"type":    "scim",
			"enabled": true,
			"config": map[string]interface{}{
				"base_url": "https://api.example.com/scim/v2",
				"token":    "updated-bearer-token",
			},
		}
		resp := client.Put(t, "/api/v1/connectors/"+createdConnectorID, updateReq)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 5. Toggle Connector
	t.Run("Toggle", func(t *testing.T) {
		if createdConnectorID == "" {
			t.Skip("No connector ID from create step")
		}
		toggleReq := map[string]interface{}{
			"enabled": false,
		}
		resp := client.Post(t, "/api/v1/connectors/"+createdConnectorID+"/toggle", toggleReq)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 6. Delete Connector
	t.Run("Delete", func(t *testing.T) {
		if createdConnectorID == "" {
			t.Skip("No connector ID from create step")
		}
		resp := client.Delete(t, "/api/v1/connectors/"+createdConnectorID)
		AssertStatus(t, resp, http.StatusNoContent)
	})
}

// TestConnectorTestConnection tests the connection testing endpoint.
func TestConnectorTestConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Test with invalid config (should fail gracefully)
	t.Run("InvalidConfig", func(t *testing.T) {
		testReq := map[string]interface{}{
			"name": "Test Connection",
			"type": "scim",
			"config": map[string]interface{}{
				"base_url": "https://invalid.example.com/scim",
				"token":    "invalid-token",
			},
		}
		resp := client.Post(t, "/api/v1/connectors/test", testReq)
		// Should return 400 for failed connection test, not 500
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected 200 or 400, got %d", resp.StatusCode)
		}
	})
}
