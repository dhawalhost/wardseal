package directory

import (
	"context"
	"sync"
	"testing"
	"time"

	"go.uber.org/zap"
)

type mockErasureService struct {
	mockDirectoryService
	mu           sync.Mutex
	pendingUsers []User
	deletedUsers []string
}

func (m *mockErasureService) ListPendingDeletions(ctx context.Context, olderThan time.Time) ([]User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.pendingUsers, nil
}

func (m *mockErasureService) DeleteUser(ctx context.Context, tenantID, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.deletedUsers = append(m.deletedUsers, userID)
	return nil
}

func TestAccountErasureWorkerLifecycleAndJob(t *testing.T) {
	logger := zap.NewNop()
	svc := &mockErasureService{
		pendingUsers: []User{
			{ID: "user-stale-1", TenantID: "tenant-1", Status: "pending_deletion"},
			{ID: "user-stale-2", TenantID: "tenant-1", Status: "pending_deletion"},
		},
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sched := StartAccountErasureWorker(ctx, svc, logger, 1*time.Hour, 30*24*time.Hour)
	if sched == nil {
		t.Fatal("expected scheduler to be non-nil")
	}

	if count := sched.Count(); count != 1 {
		t.Fatalf("expected 1 job registered in scheduler, got %d", count)
	}

	// Test the execution directly
	runAccountErasureJob(ctx, svc, logger, 30*24*time.Hour)

	svc.mu.Lock()
	deletedCount := len(svc.deletedUsers)
	svc.mu.Unlock()

	if deletedCount != 2 {
		t.Fatalf("expected 2 users deleted, got %d", deletedCount)
	}

	// Stop scheduler
	stopCtx, stopCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer stopCancel()

	if err := sched.Stop(stopCtx); err != nil {
		t.Fatalf("unexpected error stopping scheduler: %v", err)
	}
}
