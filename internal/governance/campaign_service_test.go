package governance

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockCampaignStore struct {
	mu        sync.Mutex
	campaigns map[string]Campaign
	items     map[string]CertificationItem
	nextID    int
}

func newMockCampaignStore() *mockCampaignStore {
	return &mockCampaignStore{
		campaigns: make(map[string]Campaign),
		items:     make(map[string]CertificationItem),
	}
}

func (m *mockCampaignStore) CreateCampaign(ctx context.Context, c Campaign) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextID++
	id := fmt.Sprintf("camp-%d", m.nextID)
	c.ID = id
	c.Status = "draft"
	m.campaigns[id] = c
	return id, nil
}

func (m *mockCampaignStore) GetCampaign(ctx context.Context, tenantID, id string) (Campaign, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.campaigns[id]
	if !ok || c.TenantID != tenantID {
		return Campaign{}, fmt.Errorf("campaign not found")
	}
	return c, nil
}

func (m *mockCampaignStore) ListCampaigns(ctx context.Context, tenantID, status string) ([]Campaign, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var res []Campaign
	for _, c := range m.campaigns {
		if c.TenantID == tenantID && (status == "" || c.Status == status) {
			res = append(res, c)
		}
	}
	return res, nil
}

func (m *mockCampaignStore) UpdateCampaignStatus(ctx context.Context, id, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.campaigns[id]
	if !ok {
		return fmt.Errorf("campaign not found")
	}
	c.Status = status
	m.campaigns[id] = c
	return nil
}

func (m *mockCampaignStore) DeleteCampaign(ctx context.Context, tenantID, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.campaigns, id)
	return nil
}

func (m *mockCampaignStore) CreateItem(ctx context.Context, item CertificationItem) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextID++
	id := fmt.Sprintf("item-%d", m.nextID)
	item.ID = id
	m.items[id] = item
	return id, nil
}

func (m *mockCampaignStore) GetItem(ctx context.Context, itemID string) (CertificationItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.items[itemID]
	if !ok {
		return CertificationItem{}, fmt.Errorf("item not found")
	}
	return item, nil
}

func (m *mockCampaignStore) ListItems(ctx context.Context, campaignID, decision string) ([]CertificationItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var res []CertificationItem
	for _, item := range m.items {
		if item.CampaignID == campaignID {
			if decision == "" && item.Decision == nil {
				res = append(res, item)
			} else if decision != "" && item.Decision != nil && *item.Decision == decision {
				res = append(res, item)
			}
		}
	}
	return res, nil
}

func (m *mockCampaignStore) ListItemsByReviewer(ctx context.Context, tenantID, reviewerID string) ([]CertificationItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var res []CertificationItem
	for _, item := range m.items {
		if item.TenantID == tenantID {
			res = append(res, item)
		}
	}
	return res, nil
}

func (m *mockCampaignStore) UpdateItemDecision(ctx context.Context, itemID, decision, comment string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.items[itemID]
	if !ok {
		return fmt.Errorf("item not found")
	}
	now := time.Now()
	item.Decision = &decision
	item.DecisionComment = &comment
	item.DecisionAt = &now
	m.items[itemID] = item
	return nil
}

type mockCampaignDirClient struct {
	fakeDirClient
	users []User
}

func (m *mockCampaignDirClient) ListUsers(ctx context.Context, tenantID string) ([]User, error) {
	return m.users, nil
}

func TestCampaignService_AddReviewItemsBatch(t *testing.T) {
	store := newMockCampaignStore()
	svc := NewCampaignService(store, nil, nil)

	ctx := context.Background()
	tenantID := "tenant-alpha"
	campaignID := "camp-100"

	items := make([]CertificationItem, 50)
	for i := 0; i < 50; i++ {
		items[i] = CertificationItem{
			UserID:       fmt.Sprintf("user-%d", i),
			ResourceType: "group_membership",
			ResourceID:   fmt.Sprintf("grp-%d", i%5),
			ResourceName: fmt.Sprintf("Engineering Group %d", i%5),
		}
	}

	err := svc.AddReviewItemsBatch(ctx, tenantID, campaignID, items)
	require.NoError(t, err)

	store.mu.Lock()
	itemCount := len(store.items)
	store.mu.Unlock()

	assert.Equal(t, 50, itemCount)
}

func TestCampaignService_GenerateRecertificationCampaign_Batched(t *testing.T) {
	store := newMockCampaignStore()
	dirClient := &mockCampaignDirClient{}
	for i := 0; i < 25; i++ {
		dirClient.users = append(dirClient.users, User{
			ID:    fmt.Sprintf("user-recert-%d", i),
			Email: fmt.Sprintf("user-%d@wardseal.com", i),
		})
	}

	svc := NewCampaignService(store, dirClient, nil)
	ctx := context.Background()
	tenantID := "tenant-beta"

	err := svc.GenerateRecertificationCampaign(ctx, tenantID, "Q4 Access Review")
	require.NoError(t, err)

	store.mu.Lock()
	campaignCount := len(store.campaigns)
	itemCount := len(store.items)
	store.mu.Unlock()

	assert.Equal(t, 1, campaignCount)
	assert.Equal(t, 25, itemCount)

	// Verify the campaign transitioned to active
	campaigns, err := svc.ListCampaigns(ctx, tenantID, "active")
	require.NoError(t, err)
	assert.Len(t, campaigns, 1)
	assert.Equal(t, "Q4 Access Review", campaigns[0].Name)
}
