package governance

import (
	"context"
	"errors"
	"testing"

	"github.com/dhawalhost/wardseal/internal/oauthclient"
	"github.com/dhawalhost/wardseal/internal/policy"
	"github.com/dhawalhost/wardseal/internal/rbac"
)

var ctx = context.Background()

func TestCreateOAuthClientValidatesRedirects(t *testing.T) {
	svc := NewService(&fakeStore{}, nil, &fakeOrgStore{}, &fakeEndpointStore{}, nil, &fakeDirClient{}, &fakePolicyEngine{}, &fakeRBACSvc{}, nil, nil)
	_, err := svc.CreateOAuthClient(ctx, "admin-system", CreateOAuthClientInput{
		ClientID:      "client-a",
		Name:          "Client A",
		RedirectURIs:  nil,
		AllowedScopes: []string{"openid"},
	})
	if err == nil || !IsValidationError(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestCreateOAuthClientHashesSecret(t *testing.T) {
	store := &fakeStore{}
	svc := NewService(store, nil, &fakeOrgStore{}, &fakeEndpointStore{}, nil, &fakeDirClient{}, &fakePolicyEngine{}, &fakeRBACSvc{}, nil, nil)
	secret := "super-secret"
	client, err := svc.CreateOAuthClient(ctx, "admin-system", CreateOAuthClientInput{
		ClientID:      "client-b",
		Name:          "Client B",
		ClientType:    "confidential",
		RedirectURIs:  []string{"https://app.wardseal.com/callback"},
		AllowedScopes: []string{"openid"},
		ClientSecret:  secret,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(store.lastCreateParams.ClientSecretHash) == 0 {
		t.Fatalf("expected secret hash to be stored")
	}
	if client.ClientType != "confidential" {
		t.Fatalf("expected confidential client type")
	}
}

func TestUpdateOAuthClientValidatesRedirects(t *testing.T) {
	store := &fakeStore{}
	svc := NewService(store, nil, &fakeOrgStore{}, &fakeEndpointStore{}, nil, &fakeDirClient{}, &fakePolicyEngine{}, &fakeRBACSvc{}, nil, nil)
	_, err := svc.UpdateOAuthClient(ctx, "admin-system", "client-x", UpdateOAuthClientInput{
		RedirectURIs: []string{"http://localhost:bad"},
	})
	if err == nil || !IsValidationError(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

type fakeStore struct {
	clients          map[string]oauthclient.Client
	lastCreateParams oauthclient.CreateClientParams
}

func (f *fakeStore) ensureClients() {
	if f.clients == nil {
		f.clients = map[string]oauthclient.Client{}
	}
}

func (f *fakeStore) ListClients(ctx context.Context) ([]oauthclient.Client, error) {
	f.ensureClients()
	out := make([]oauthclient.Client, 0, len(f.clients))
	for _, c := range f.clients {
		out = append(out, c)
	}
	return out, nil
}

func (f *fakeStore) ListClientsByTenant(ctx context.Context, tenantID string) ([]oauthclient.Client, error) {
	f.ensureClients()
	var out []oauthclient.Client
	for _, c := range f.clients {
		if c.TenantID == tenantID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f *fakeStore) GetClient(ctx context.Context, tenantID, clientID string) (oauthclient.Client, error) {
	f.ensureClients()
	c, ok := f.clients[tenantID+clientID]
	if !ok {
		return oauthclient.Client{}, oauthclient.ErrNotFound
	}
	return c, nil
}

func (f *fakeStore) CreateClient(ctx context.Context, params oauthclient.CreateClientParams) (oauthclient.Client, error) {
	f.ensureClients()
	f.lastCreateParams = params
	client := oauthclient.Client{
		TenantID:      params.TenantID,
		ClientID:      params.ClientID,
		ClientType:    params.ClientType,
		Name:          params.Name,
		RedirectURIs:  params.RedirectURIs,
		AllowedScopes: params.AllowedScopes,
	}
	f.clients[params.TenantID+params.ClientID] = client
	return client, nil
}

func (f *fakeStore) UpdateClient(ctx context.Context, tenantID, clientID string, params oauthclient.UpdateClientParams) (oauthclient.Client, error) {
	f.ensureClients()
	client := oauthclient.Client{TenantID: tenantID, ClientID: clientID}
	f.clients[tenantID+clientID] = client
	return client, nil
}

func (f *fakeStore) DeleteClient(ctx context.Context, tenantID, clientID string) error {
	f.ensureClients()
	delete(f.clients, tenantID+clientID)
	return nil
}

type fakeDirClient struct{}

func (f *fakeDirClient) GetUserByID(ctx context.Context, tenantID, userID string) (User, error) {
	return User{}, nil
}
func (f *fakeDirClient) AddUserToGroup(ctx context.Context, tenantID, userID, groupID string) error {
	return nil
}
func (f *fakeDirClient) RemoveUserFromGroup(ctx context.Context, tenantID, userID, groupID string) error {
	return nil
}
func (f *fakeDirClient) ResolveTenantSlug(ctx context.Context, slug string) (string, error) {
	return slug, nil
}
func (f *fakeDirClient) AddUserToOrganization(ctx context.Context, tenantID, userID, orgID, role string) error {
	return nil
}
func (f *fakeDirClient) RemoveUserFromOrganization(ctx context.Context, tenantID, userID, orgID string) error {
	return nil
}
func (f *fakeDirClient) ListUserOrganizations(ctx context.Context, tenantID, userID string) ([]string, error) {
	return nil, nil
}
func (f *fakeDirClient) ListUsers(ctx context.Context, tenantID string) ([]User, error) {
	return nil, nil
}
func (f *fakeDirClient) ListGroups(ctx context.Context, tenantID string) ([]Group, error) {
	return nil, nil
}

type fakeOrgStore struct{}

func (f *fakeOrgStore) Create(ctx context.Context, org *Organization) error { return nil }
func (f *fakeOrgStore) Get(ctx context.Context, tenantID, orgID string) (*Organization, error) {
	return nil, nil
}
func (f *fakeOrgStore) GetByName(ctx context.Context, tenantID, name string) (*Organization, error) {
	return nil, nil
}
func (f *fakeOrgStore) List(ctx context.Context, tenantID string, limit, offset int) ([]Organization, error) {
	return nil, nil
}
func (f *fakeOrgStore) Update(ctx context.Context, org *Organization) error      { return nil }
func (f *fakeOrgStore) Delete(ctx context.Context, tenantID, orgID string) error { return nil }

type fakePolicyEngine struct{}

func (f *fakePolicyEngine) Evaluate(ctx context.Context, input policy.Input) (bool, string, error) {
	return true, "Allowed", nil
}

type fakeRBACSvc struct{}

func (f *fakeRBACSvc) CreateRole(ctx context.Context, tenantID, name, description string) (rbac.Role, error) {
	return rbac.Role{}, nil
}
func (f *fakeRBACSvc) GetRole(ctx context.Context, tenantID, id string) (rbac.Role, error) {
	return rbac.Role{}, nil
}
func (f *fakeRBACSvc) ListRoles(ctx context.Context, tenantID string) ([]rbac.Role, error) {
	return nil, nil
}
func (f *fakeRBACSvc) UpdateRole(ctx context.Context, tenantID, id, name, description string) (rbac.Role, error) {
	return rbac.Role{}, nil
}
func (f *fakeRBACSvc) DeleteRole(ctx context.Context, tenantID, id string) error { return nil }

func (f *fakeRBACSvc) CreatePermission(ctx context.Context, tenantID, resource, action, description string) (rbac.Permission, error) {
	return rbac.Permission{}, nil
}
func (f *fakeRBACSvc) ListPermissions(ctx context.Context, tenantID string) ([]rbac.Permission, error) {
	return nil, nil
}

func (f *fakeRBACSvc) AssignPermissionToRole(ctx context.Context, roleID, permissionID string) error {
	return nil
}
func (f *fakeRBACSvc) RemovePermissionFromRole(ctx context.Context, roleID, permissionID string) error {
	return nil
}
func (f *fakeRBACSvc) GetRolePermissions(ctx context.Context, roleID string) ([]rbac.Permission, error) {
	return nil, nil
}

func (f *fakeRBACSvc) AssignRoleToUser(ctx context.Context, tenantID, userID, roleID string, assignedBy *string) error {
	return nil
}
func (f *fakeRBACSvc) AssignRoleWithExpiration(ctx context.Context, tenantID, userID, roleID string, assignedBy *string, duration string) error {
	return nil
}
func (f *fakeRBACSvc) RemoveRoleFromUser(ctx context.Context, userID, roleID string) error {
	return nil
}
func (f *fakeRBACSvc) GetUserRoles(ctx context.Context, tenantID, userID string) ([]rbac.Role, error) {
	return nil, nil
}
func (f *fakeRBACSvc) GetUserPermissions(ctx context.Context, tenantID, userID string) ([]rbac.Permission, error) {
	return nil, nil
}
func (f *fakeRBACSvc) ListExpiredAssignments(ctx context.Context) ([]rbac.UserRole, error) {
	return nil, nil
}

func (f *fakeRBACSvc) HasPermission(ctx context.Context, tenantID, userID, resource, action string) (bool, error) {
	return true, nil
}

type fakeEndpointStore struct{}

func (f *fakeEndpointStore) RegisterDevice(ctx context.Context, d Device) (string, error) {
	return "dev-1", nil
}
func (f *fakeEndpointStore) ListDevices(ctx context.Context, tenantID string) ([]Device, error) {
	return nil, nil
}
func (f *fakeEndpointStore) GetDevice(ctx context.Context, tenantID, id string) (Device, error) {
	return Device{}, nil
}
func (f *fakeEndpointStore) UpdateDeviceStatus(ctx context.Context, tenantID, id, status string) error {
	return nil
}
func (f *fakeEndpointStore) GetDevicesByUser(ctx context.Context, tenantID, userID string) ([]Device, error) {
	return nil, nil
}

type fakeReqStore struct {
	requests map[string]AccessRequest
}

func (f *fakeReqStore) CreateRequest(ctx context.Context, req AccessRequest) (string, error) {
	if f.requests == nil {
		f.requests = make(map[string]AccessRequest)
	}
	id := "req-1"
	req.ID = id
	req.Status = "pending"
	f.requests[id] = req
	return id, nil
}

func (f *fakeReqStore) GetRequest(ctx context.Context, tenantID, id string) (AccessRequest, error) {
	if req, ok := f.requests[id]; ok {
		return req, nil
	}
	return AccessRequest{}, errors.New("not found")
}

func (f *fakeReqStore) ListRequests(ctx context.Context, tenantID, status string) ([]AccessRequest, error) {
	var out []AccessRequest
	for _, r := range f.requests {
		out = append(out, r)
	}
	return out, nil
}

func (f *fakeReqStore) UpdateRequestStatus(ctx context.Context, id, status string) error {
	if req, ok := f.requests[id]; ok {
		req.Status = status
		f.requests[id] = req
		return nil
	}
	return errors.New("not found")
}

func (f *fakeReqStore) CreateIPPolicy(ctx context.Context, p IPPolicy) (string, error)    { return "", nil }
func (f *fakeReqStore) ListIPPolicies(ctx context.Context, tenantID string) ([]IPPolicy, error) {
	return nil, nil
}
func (f *fakeReqStore) DeleteIPPolicy(ctx context.Context, tenantID, id string) error { return nil }
func (f *fakeReqStore) CreateSafetyAction(ctx context.Context, action SafetyAction) (string, error) {
	return "", nil
}
func (f *fakeReqStore) GetSafetyAction(ctx context.Context, tenantID, id string) (SafetyAction, error) {
	return SafetyAction{}, nil
}
func (f *fakeReqStore) ListSafetyActions(ctx context.Context, tenantID, status string) ([]SafetyAction, error) {
	return nil, nil
}
func (f *fakeReqStore) UpdateSafetyActionStatus(ctx context.Context, id, status string) error {
	return nil
}

func TestAccessRequest_WorkflowFSM(t *testing.T) {
	reqStore := &fakeReqStore{}
	svc := NewService(&fakeStore{}, reqStore, &fakeOrgStore{}, &fakeEndpointStore{}, nil, &fakeDirClient{}, &fakePolicyEngine{}, &fakeRBACSvc{}, nil, nil)

	// 1. Create access request
	req, err := svc.CreateAccessRequest(ctx, "tenant-a", CreateAccessRequest{
		RequesterID:  "user-1",
		ResourceType: "group",
		ResourceID:   "grp-1",
		Reason:       "Need access for onboarding",
	})
	if err != nil {
		t.Fatalf("failed to create access request: %v", err)
	}
	if req.Status != "pending" {
		t.Fatalf("expected pending status, got %s", req.Status)
	}

	// 2. Approve access request (valid transition: pending -> approved)
	err = svc.ApproveAccessRequest(ctx, "tenant-a", req.ID, "approver-1", "Approved")
	if err != nil {
		t.Fatalf("expected approve to succeed, got %v", err)
	}

	// 3. Attempt to approve again (invalid transition: approved -> approved is blocked by FSM)
	err = svc.ApproveAccessRequest(ctx, "tenant-a", req.ID, "approver-2", "Double approve")
	if err == nil {
		t.Fatalf("expected second approve to fail, got nil")
	}

	// 4. Attempt to reject already approved request (invalid transition: approved -> rejected is blocked by FSM)
	err = svc.RejectAccessRequest(ctx, "tenant-a", req.ID, "approver-2", "Reject approved")
	if err == nil {
		t.Fatalf("expected reject on approved request to fail, got nil")
	}
}
