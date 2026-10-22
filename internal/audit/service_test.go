package audit

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockRepository struct {
	mu     sync.Mutex
	events []Event
}

func (m *mockRepository) Log(ctx context.Context, e Event) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, e)
	return "event-" + string(rune(len(m.events))), nil
}

func (m *mockRepository) Query(ctx context.Context, params QueryParams) ([]Event, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.events, len(m.events), nil
}

func (m *mockRepository) GetEvent(ctx context.Context, tenantID, id string) (Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.events) > 0 {
		return m.events[0], nil
	}
	return Event{}, nil
}

func (m *mockRepository) GetStats(ctx context.Context, tenantID string, lookbackDays int) (Stats, error) {
	return Stats{TotalEvents: len(m.events)}, nil
}

func TestAuditService_SyncLog(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(repo)

	ctx := context.Background()
	err := svc.Log(ctx, LogInput{
		TenantID:     "t-1",
		Action:       "user.login",
		ResourceType: "user",
	})
	require.NoError(t, err)

	events, count, err := svc.Query(ctx, QueryParams{TenantID: "t-1"})
	require.NoError(t, err)
	assert.Equal(t, 1, count)
	assert.Equal(t, "user.login", events[0].Action)
}

func TestAuditService_BatchingService(t *testing.T) {
	repo := &mockRepository{}
	batchSvc := NewBatchingService(repo, 3, 50*time.Millisecond)
	defer batchSvc.Close()

	ctx := context.Background()

	// Push 3 events to trigger immediate batch flush
	for i := 1; i <= 3; i++ {
		err := batchSvc.Log(ctx, LogInput{
			TenantID:     "t-batch",
			Action:       "permission.grant",
			ResourceType: "role",
		})
		require.NoError(t, err)
	}

	// Wait briefly or flush
	err := batchSvc.Flush(ctx)
	require.NoError(t, err)

	events, count, err := batchSvc.Query(ctx, QueryParams{TenantID: "t-batch"})
	require.NoError(t, err)
	assert.Equal(t, 3, count)
	assert.Len(t, events, 3)
}
