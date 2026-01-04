//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestDirectoryHealthCheck tests the directory service health endpoint.
func TestDirectoryHealthCheck(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.DirServer.URL, env.TestTenantID)
	resp := client.Get(t, "/health")
	AssertStatus(t, resp, http.StatusOK)

	var result map[string]interface{}
	ReadJSON(t, resp, &result)
	if result["healthy"] != true {
		t.Errorf("Expected healthy=true, got %v", result["healthy"])
	}
}

// TestUserCRUD tests the full CRUD lifecycle for users.
func TestUserCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.DirServer.URL, env.TestTenantID)
	var createdUserID string

	// 1. Create User
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"email":    "newuser@example.com",
			"password": "SecurePassword123!",
		}
		resp := client.Post(t, "/api/v1/users", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected user ID in response")
		}
		createdUserID = id
		if created["email"] != "newuser@example.com" {
			t.Errorf("Expected email=newuser@example.com, got %v", created["email"])
		}
	})

	// 2. Get User by ID
	t.Run("GetByID", func(t *testing.T) {
		if createdUserID == "" {
			t.Skip("No user ID from create step")
		}
		resp := client.Get(t, "/api/v1/users/"+createdUserID)
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if result["id"] != createdUserID {
			t.Errorf("Expected id=%s, got %v", createdUserID, result["id"])
		}
	})

	// 3. Get User by Email
	t.Run("GetByEmail", func(t *testing.T) {
		resp := client.Get(t, "/api/v1/users/by-email/newuser@example.com")
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if result["email"] != "newuser@example.com" {
			t.Errorf("Expected email=newuser@example.com, got %v", result["email"])
		}
	})

	// 4. Update User
	t.Run("Update", func(t *testing.T) {
		if createdUserID == "" {
			t.Skip("No user ID from create step")
		}
		updateReq := map[string]interface{}{
			"status": "inactive",
		}
		resp := client.Put(t, "/api/v1/users/"+createdUserID, updateReq)
		AssertStatus(t, resp, http.StatusOK)

		var updated map[string]interface{}
		ReadJSON(t, resp, &updated)
		if updated["status"] != "inactive" {
			t.Errorf("Expected status=inactive, got %v", updated["status"])
		}
	})

	// 5. Delete User
	t.Run("Delete", func(t *testing.T) {
		if createdUserID == "" {
			t.Skip("No user ID from create step")
		}
		resp := client.Delete(t, "/api/v1/users/"+createdUserID)
		AssertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		getResp := client.Get(t, "/api/v1/users/"+createdUserID)
		AssertStatus(t, getResp, http.StatusNotFound)
	})
}

// TestGroupCRUD tests the full CRUD lifecycle for groups.
func TestGroupCRUD(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.DirServer.URL, env.TestTenantID)
	var createdGroupID string

	// 1. Create Group
	t.Run("Create", func(t *testing.T) {
		createReq := map[string]interface{}{
			"name":        "Test Group",
			"description": "A test group for integration testing",
		}
		resp := client.Post(t, "/api/v1/groups", createReq)
		AssertStatus(t, resp, http.StatusCreated)

		var created map[string]interface{}
		ReadJSON(t, resp, &created)
		id, ok := created["id"].(string)
		if !ok || id == "" {
			t.Fatal("Expected group ID in response")
		}
		createdGroupID = id
		if created["name"] != "Test Group" {
			t.Errorf("Expected name=Test Group, got %v", created["name"])
		}
	})

	// 2. Get Group
	t.Run("Get", func(t *testing.T) {
		if createdGroupID == "" {
			t.Skip("No group ID from create step")
		}
		resp := client.Get(t, "/api/v1/groups/"+createdGroupID)
		AssertStatus(t, resp, http.StatusOK)

		var result map[string]interface{}
		ReadJSON(t, resp, &result)
		if result["id"] != createdGroupID {
			t.Errorf("Expected id=%s, got %v", createdGroupID, result["id"])
		}
	})

	// 3. Update Group
	t.Run("Update", func(t *testing.T) {
		if createdGroupID == "" {
			t.Skip("No group ID from create step")
		}
		updateReq := map[string]interface{}{
			"name":        "Updated Test Group",
			"description": "Updated description",
		}
		resp := client.Put(t, "/api/v1/groups/"+createdGroupID, updateReq)
		AssertStatus(t, resp, http.StatusOK)

		var updated map[string]interface{}
		ReadJSON(t, resp, &updated)
		if updated["name"] != "Updated Test Group" {
			t.Errorf("Expected name=Updated Test Group, got %v", updated["name"])
		}
	})

	// 4. Delete Group
	t.Run("Delete", func(t *testing.T) {
		if createdGroupID == "" {
			t.Skip("No group ID from create step")
		}
		resp := client.Delete(t, "/api/v1/groups/"+createdGroupID)
		AssertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		getResp := client.Get(t, "/api/v1/groups/"+createdGroupID)
		AssertStatus(t, getResp, http.StatusNotFound)
	})
}

// TestGroupMembership tests adding and removing users from groups.
func TestGroupMembership(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.DirServer.URL, env.TestTenantID)

	// Create a user
	userResp := client.Post(t, "/api/v1/users", map[string]interface{}{
		"email":    "member@example.com",
		"password": "SecurePassword123!",
	})
	AssertStatus(t, userResp, http.StatusCreated)
	var user map[string]interface{}
	ReadJSON(t, userResp, &user)
	userID := user["id"].(string)

	// Create a group
	groupResp := client.Post(t, "/api/v1/groups", map[string]interface{}{
		"name":        "Membership Test Group",
		"description": "Group for membership testing",
	})
	AssertStatus(t, groupResp, http.StatusCreated)
	var group map[string]interface{}
	ReadJSON(t, groupResp, &group)
	groupID := group["id"].(string)

	// Add user to group
	t.Run("AddMember", func(t *testing.T) {
		resp := client.Post(t, "/api/v1/groups/"+groupID+"/members", map[string]interface{}{
			"user_id": userID,
		})
		AssertStatus(t, resp, http.StatusOK)
	})

	// Remove user from group
	t.Run("RemoveMember", func(t *testing.T) {
		resp := client.Delete(t, "/api/v1/groups/"+groupID+"/members/"+userID)
		AssertStatus(t, resp, http.StatusNoContent)
	})

	// Cleanup
	client.Delete(t, "/api/v1/users/"+userID)
	client.Delete(t, "/api/v1/groups/"+groupID)
}

// TestCredentialVerification tests the credential verification endpoint.
func TestCredentialVerification(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	env := SetupTestEnv(t)
	defer env.Teardown(t)

	client := NewHTTPClient(env.DirServer.URL, env.TestTenantID)

	// Create a user with known credentials
	userResp := client.Post(t, "/api/v1/users", map[string]interface{}{
		"email":    "verify@example.com",
		"password": "VerifyPass123!",
	})
	AssertStatus(t, userResp, http.StatusCreated)
	var user map[string]interface{}
	ReadJSON(t, userResp, &user)
	userID := user["id"].(string)

	// Verify correct credentials
	t.Run("ValidCredentials", func(t *testing.T) {
		verifyResp := client.Post(t, "/internal/verify-credentials", map[string]interface{}{
			"email":    "verify@example.com",
			"password": "VerifyPass123!",
		})
		AssertStatus(t, verifyResp, http.StatusOK)
	})

	// Verify incorrect credentials
	t.Run("InvalidCredentials", func(t *testing.T) {
		verifyResp := client.Post(t, "/internal/verify-credentials", map[string]interface{}{
			"email":    "verify@example.com",
			"password": "WrongPassword!",
		})
		AssertStatus(t, verifyResp, http.StatusUnauthorized)
	})

	// Cleanup
	client.Delete(t, "/api/v1/users/"+userID)
}
