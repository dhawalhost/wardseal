package governance

import (
	"context"
	"sync"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/internal/auth"
	"github.com/dhawalhost/wardseal/internal/connector"
)

type mockSignalRepo struct {
	auth.SignalRepository
	highRiskUsers []auth.UserRisk
}

func (m *mockSignalRepo) GetHighRiskUsers(ctx context.Context, tenantID string, threshold int) ([]auth.UserRisk, error) {
	return m.highRiskUsers, nil
}

type mockProvService struct {
	mu           sync.Mutex
	enqueuedTasks []connector.ProvisioningTask
}

func (m *mockProvService) EnqueueTask(ctx context.Context, task connector.ProvisioningTask) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.enqueuedTasks = append(m.enqueuedTasks, task)
	return "mock-task-1", nil
}

func (m *mockProvService) Start(ctx context.Context) {}

func (m *mockProvService) ExecuteTask(ctx context.Context, taskID string) error {
	return nil
}

func TestRiskGovernorLifecycleAndMitigation(t *testing.T) {
	logger := zap.NewNop()
	signalStore := &mockSignalRepo{
		highRiskUsers: []auth.UserRisk{
			{
				TenantID: "tenant-1",
				UserID:   "user-danger-1",
				Score:    95,
				Factors:  `["impossible_travel", "failed_mfa_burst"]`,
			},
		},
	}
	provSvc := &mockProvService{}

	governor := NewRiskGovernor(signalStore, provSvc, nil, logger)
	if governor == nil {
		t.Fatal("expected governor to be non-nil")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	governor.Start(ctx)
	if count := governor.sched.Count(); count != 1 {
		t.Fatalf("expected 1 registered job in scheduler, got %d", count)
	}

	// Trigger manual sweep and verify mitigation task was enqueued
	governor.PerformSweep(ctx)

	provSvc.mu.Lock()
	taskCount := len(provSvc.enqueuedTasks)
	provSvc.mu.Unlock()

	if taskCount != 1 {
		t.Fatalf("expected 1 mitigation task enqueued, got %d", taskCount)
	}

	// Verify Stop
	stopCtx, stopCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer stopCancel()

	if err := governor.Stop(stopCtx); err != nil {
		t.Fatalf("unexpected error stopping risk governor: %v", err)
	}
}
