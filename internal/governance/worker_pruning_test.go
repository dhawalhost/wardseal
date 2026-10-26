package governance

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestPruningGovernorLifecycle(t *testing.T) {
	logger := zap.NewNop()
	governor := NewPruningGovernor(nil, logger)

	if governor == nil {
		t.Fatal("expected governor to be non-nil")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	governor.Start(ctx)
	if count := governor.sched.Count(); count != 1 {
		t.Fatalf("expected 1 registered job in scheduler, got %d", count)
	}

	// Verify manual sweep invocation works without error
	governor.PerformPruningSweep(ctx)

	// Verify graceful shutdown
	stopCtx, stopCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer stopCancel()

	if err := governor.Stop(stopCtx); err != nil {
		t.Fatalf("unexpected error stopping governor: %v", err)
	}
}
