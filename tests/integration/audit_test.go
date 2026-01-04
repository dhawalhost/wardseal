//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestAuditLogQuery tests querying audit logs.
func TestAuditLogQuery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Query all audit logs
	t.Run("QueryAll", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if _, ok := result["events"]; !ok {
			t.Fatal("Expected events array in response")
		}
		if _, ok := result["total"]; !ok {
			t.Fatal("Expected total count in response")
		}
	})

	// Query with filters
	t.Run("QueryWithFilters", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit?action=login&limit=10&offset=0")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if _, ok := result["events"]; !ok {
			t.Fatal("Expected events array in response")
		}
	})

	// Query by actor
	t.Run("QueryByActor", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit?actor_id="+env.TestUserID)
		AssertStatus(t, resp, http.StatusOK)
	})

	// Query by resource type
	t.Run("QueryByResourceType", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit?resource_type=user")
		AssertStatus(t, resp, http.StatusOK)
	})
}

// TestAuditLogExport tests exporting audit logs as CSV.
func TestAuditLogExport(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	t.Run("ExportCSV", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit/export")
		AssertStatus(t, resp, http.StatusOK)

		contentType := resp.Header.Get("Content-Type")
		if contentType != "text/csv" {
			t.Errorf("Expected Content-Type text/csv, got %s", contentType)
		}

		disposition := resp.Header.Get("Content-Disposition")
		if disposition == "" {
			t.Error("Expected Content-Disposition header")
		}
	})
}

// TestAuditEventGetByID tests getting a specific audit event.
func TestAuditEventGetByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Get non-existent event
	t.Run("NotFound", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/audit/non-existent-id")
		AssertStatus(t, resp, http.StatusNotFound)
	})
}
