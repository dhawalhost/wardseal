package directory

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockSearchRepo struct {
	mu     sync.Mutex
	users  map[string]User
	nextID int
}

func newMockSearchRepo() *mockSearchRepo {
	return &mockSearchRepo{
		users: make(map[string]User),
	}
}

func (m *mockSearchRepo) HealthCheck(ctx context.Context) error { return nil }

func (m *mockSearchRepo) WithTransaction(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	return fn(nil)
}

func (m *mockSearchRepo) CreateIdentity(ctx context.Context, tx *sqlx.Tx, params CreateIdentityParams) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextID++
	id := fmt.Sprintf("user-%d", m.nextID)
	m.users[id] = User{
		ID:          id,
		TenantID:    params.TenantID,
		DisplayName: params.DisplayName,
		ExternalID:  params.ExternalID,
		Department:  params.Department,
		Title:       params.Title,
		Timezone:    params.Timezone,
		Status:      "active",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	return id, nil
}

func (m *mockSearchRepo) CreateAccount(ctx context.Context, tx *sqlx.Tx, userID, tenantID, email, passwordHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u := m.users[userID]
	u.Email = email
	m.users[userID] = u
	return nil
}

func (m *mockSearchRepo) GetUserByID(ctx context.Context, tenantID, id string) (User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.users[id]
	if !ok || u.TenantID != tenantID {
		return User{}, fmt.Errorf("user not found")
	}
	return u, nil
}

func (m *mockSearchRepo) GetUserByEmail(ctx context.Context, tenantID, email string) (User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, u := range m.users {
		if u.TenantID == tenantID && u.Email == email {
			return u, nil
		}
	}
	return User{}, fmt.Errorf("user not found")
}

func (m *mockSearchRepo) ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]User, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var res []User
	for _, u := range m.users {
		if u.TenantID == tenantID {
			res = append(res, u)
		}
	}
	return res, len(res), nil
}

func (m *mockSearchRepo) ListPendingDeletions(ctx context.Context, olderThan time.Time) ([]User, error) {
	return nil, nil
}

func (m *mockSearchRepo) UpdateIdentity(ctx context.Context, tx *sqlx.Tx, params UpdateIdentityParams) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.users[params.ID]
	if !ok || u.TenantID != params.TenantID {
		return fmt.Errorf("user not found")
	}
	if params.DisplayName != nil {
		u.DisplayName = params.DisplayName
	}
	if params.Department != nil {
		u.Department = params.Department
	}
	if params.Title != nil {
		u.Title = params.Title
	}
	if params.Status != "" {
		u.Status = params.Status
	}
	m.users[params.ID] = u
	return nil
}

func (m *mockSearchRepo) UpdateAccount(ctx context.Context, tx *sqlx.Tx, tenantID, id, email, passwordHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.users[id]
	if !ok {
		return fmt.Errorf("user not found")
	}
	if email != "" {
		u.Email = email
	}
	m.users[id] = u
	return nil
}

func (m *mockSearchRepo) DeleteIdentity(ctx context.Context, tenantID, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.users, id)
	return nil
}

func (m *mockSearchRepo) CreateGroup(ctx context.Context, tenantID string, name string) (string, error) {
	return "grp-1", nil
}
func (m *mockSearchRepo) GetGroupByID(ctx context.Context, tenantID, id string) (Group, error) {
	return Group{}, nil
}
func (m *mockSearchRepo) ListGroups(ctx context.Context, tenantID string, limit, offset int) ([]Group, int, error) {
	return nil, 0, nil
}
func (m *mockSearchRepo) UpdateGroup(ctx context.Context, tenantID, id, name string) error {
	return nil
}
func (m *mockSearchRepo) DeleteGroup(ctx context.Context, tenantID, id string) error { return nil }
func (m *mockSearchRepo) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	return nil
}
func (m *mockSearchRepo) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	return nil
}
func (m *mockSearchRepo) ListGroupMembers(ctx context.Context, tenantID, groupID string) ([]User, error) {
	return nil, nil
}
func (m *mockSearchRepo) ListUserGroups(ctx context.Context, tenantID, userID string) ([]Group, error) {
	return nil, nil
}
func (m *mockSearchRepo) AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error {
	return nil
}
func (m *mockSearchRepo) RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error {
	return nil
}
func (m *mockSearchRepo) ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error) {
	return nil, nil
}
func (m *mockSearchRepo) CreateTenant(ctx context.Context, id, name, slug, plan string) error {
	return nil
}
func (m *mockSearchRepo) GetTenantIDBySlug(ctx context.Context, slug string) (string, error) {
	return "", nil
}
func (m *mockSearchRepo) GetTenantIDByEmail(ctx context.Context, email string) (string, error) {
	return "", nil
}
func (m *mockSearchRepo) GetPasswordHash(ctx context.Context, tenantID, email string) (User, string, error) {
	return User{}, "", nil
}
func (m *mockSearchRepo) GetAPIKeyByPrefix(ctx context.Context, prefix string) ([]APIKeyCandidate, error) {
	return nil, nil
}
func (m *mockSearchRepo) UpdateAPIKeyLastUsed(ctx context.Context, id, tenantID string) error {
	return nil
}

func strPtrSearch(s string) *string { return &s }

func TestDirectoryService_OkapiBM25SearchAndTypeahead(t *testing.T) {
	repo := newMockSearchRepo()
	svc := NewService(repo, nil)
	ctx := context.Background()

	tenantA := "tenant-a"
	tenantB := "tenant-b"

	// Create users in Tenant A
	u1ID, err := svc.CreateUser(ctx, tenantA, User{
		Email:       "alice.smith@cyberdyne.io",
		DisplayName: strPtrSearch("Alice Smith"),
		Department:  strPtrSearch("Security Operations"),
		Title:       strPtrSearch("Lead Security Engineer"),
		Password:    "Str0ng!P@ssw0rd123",
	})
	require.NoError(t, err)

	u2ID, err := svc.CreateUser(ctx, tenantA, User{
		Email:       "bob.jones@cyberdyne.io",
		DisplayName: strPtrSearch("Bob Jones"),
		Department:  strPtrSearch("Infrastructure"),
		Title:       strPtrSearch("DevOps Specialist"),
		Password:    "Str0ng!P@ssw0rd123",
	})
	require.NoError(t, err)

	// Create user in Tenant B (cross-tenant isolation test)
	_, err = svc.CreateUser(ctx, tenantB, User{
		Email:       "alice.cooper@othercorp.com",
		DisplayName: strPtrSearch("Alice Cooper"),
		Department:  strPtrSearch("Security Operations"),
		Title:       strPtrSearch("CISO"),
		Password:    "Str0ng!P@ssw0rd123",
	})
	require.NoError(t, err)

	// 1. Live typeahead prefix search for "Ali" in Tenant A
	results, err := svc.SearchUsers(ctx, tenantA, "Ali", 10)
	require.NoError(t, err)
	require.Len(t, results, 1, "Expected only Tenant A's Alice to match typeahead prefix")
	assert.Equal(t, u1ID, results[0].ID)
	require.NotNil(t, results[0].DisplayName)
	assert.Equal(t, "Alice Smith", *results[0].DisplayName)

	// 2. Search by department keyword "Security"
	results, err = svc.SearchUsers(ctx, tenantA, "Security", 10)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, u1ID, results[0].ID)

	// 3. Search by partial email "cyberdyne"
	results, err = svc.SearchUsers(ctx, tenantA, "cyberdyne", 10)
	require.NoError(t, err)
	assert.Len(t, results, 2, "Expected both users matching cyberdyne in tenant A")

	// 4. Multi-tenant isolation: Tenant B searching for Alice
	resultsB, err := svc.SearchUsers(ctx, tenantB, "Alice", 10)
	require.NoError(t, err)
	require.Len(t, resultsB, 1)
	require.NotNil(t, resultsB[0].DisplayName)
	assert.Equal(t, "Alice Cooper", *resultsB[0].DisplayName)

	// 5. Update user attributes and verify re-indexed search
	err = svc.UpdateUser(ctx, tenantA, u2ID, User{
		DisplayName: strPtrSearch("Bob Smith"),
		Department:  strPtrSearch("Security Operations"),
		Title:       strPtrSearch("Staff SecOps Architect"),
	})
	require.NoError(t, err)

	// Now searching "Smith" should match both Alice Smith and Bob Smith
	results, err = svc.SearchUsers(ctx, tenantA, "Smith", 10)
	require.NoError(t, err)
	assert.Len(t, results, 2)

	// 6. Delete user and verify removal from search index
	err = svc.DeleteUser(ctx, tenantA, u1ID)
	require.NoError(t, err)

	results, err = svc.SearchUsers(ctx, tenantA, "Alice", 10)
	require.NoError(t, err)
	assert.Len(t, results, 0, "Deleted user must not appear in search results")
}
