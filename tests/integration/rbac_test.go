//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestRBACRoleCRUD tests the full CRUD lifecycle for RBAC roles.
func TestRBACRoleCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)
	var createdRoleID string

	// 1. Create Role
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"name":        "Test Admin Role",
			"description": "A test role for integration testing",
		}
		resp := client.Post(t, "/api/v1/roles", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected role ID in response")
		}
		createdRoleID = id
	})

	// 2. List Roles
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/roles")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		roles, ok := result["roles"].([]interface{})
		if !ok {
			t.Fatal("Expected roles array in response")
		}
		if len(roles) < 1 {
			t.Error("Expected at least one role")
		}
	})

	// 3. Get Role
	t.Run("Get", func(t *testing.T) {
		if createdRoleID == "" {
			t.Skip("No role ID from create step")
		}
		resp := client.Get(t, "/api/v1/roles/"+createdRoleID)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 4. Update Role
	t.Run("Update", func(t *testing.T) {
		if createdRoleID == "" {
			t.Skip("No role ID from create step")
		}
		updateReq := map[string]interface{}{
			"name":        "Updated Admin Role",
			"description": "Updated description",
		}
		resp := client.Put(t, "/api/v1/roles/"+createdRoleID, updateReq)
		AssertStatus(t, resp, http.StatusOK)
	})

	// 5. Delete Role
	t.Run("Delete", func(t *testing.T) {
		if createdRoleID == "" {
			t.Skip("No role ID from create step")
		}
		resp := client.Delete(t, "/api/v1/roles/"+createdRoleID)
		AssertStatus(t, resp, http.StatusNoContent)
	})
}

// TestRBACPermissionCRUD tests permission management.
func TestRBACPermissionCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Create Permission
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"resource":    "users",
			"action":      "read",
			"description": "Read users permission",
		}
		resp := client.Post(t, "/api/v1/permissions", createReq)
		AssertStatus(t, resp, http.StatusCreated)
	})

	// List Permissions
	t.Run("List", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/permissions")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if _, ok := result["permissions"]; !ok {
			t.Fatal("Expected permissions array in response")
		}
	})
}

// TestRBACUserRoleAssignment tests assigning roles to users.
func TestRBACUserRoleAssignment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	// Create a role first
	roleResp := client.Post(t, "/api/v1/roles", map[string]interface{}{
		"name":        "Assignment Test Role",
		"description": "Role for assignment testing",
	})
	AssertStatus(t, roleResp, http.StatusCreated)
	var role map[string]interface{}
	ReadJSON(t, roleResp, &role)
	roleID := role["id"].(string)

	// Get user roles
	t.Run("GetUserRoles", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/users/"+env.TestUserID+"/roles")
		AssertStatus(t, resp, http.StatusOK)
	})

	// Assign role to user
	t.Run("AssignRole", func(t *testing.T) {
		resp := client.Post(t, "/api/v1/users/"+env.TestUserID+"/roles/"+roleID, nil)
		AssertStatus(t, resp, http.StatusOK)
	})

	// Remove role from user
	t.Run("RemoveRole", func(t *testing.T) {
		resp := client.Delete(t, "/api/v1/users/"+env.TestUserID+"/roles/"+roleID)
		AssertStatus(t, resp, http.StatusNoContent)
	})

	// Cleanup
	client.Delete(t, "/api/v1/roles/"+roleID)
}

// TestRBACUserPermissions tests getting user permissions.
func TestRBACUserPermissions(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.GovServer.URL, env.TestTenantID)

	resp := client.Get(t, "/api/v1/users/"+env.TestUserID+"/permissions")
	AssertStatus(t, resp, http.StatusOK)

	var result map[string]interface{}
	ReadJSON(t, resp, &result)
	if _, ok := result["permissions"]; !ok {
		t.Fatal("Expected permissions array in response")
	}
}
