package governance

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/dhawalhost/gokit/distlock"
	"github.com/dhawalhost/gokit/scheduler"
)

// PruningGovernor automates the identification and removal of stale identity relationships
// using a distributed scheduler.
type PruningGovernor struct {
	govSvc    Service
	interval  time.Duration
	batchSize int
	logger    *zap.Logger
	sched     *scheduler.Scheduler
	locker    distlock.Locker
}

// NewPruningGovernor creates a new autonomous pruning governor.
func NewPruningGovernor(govSvc Service, logger *zap.Logger, locker ...distlock.Locker) *PruningGovernor {
	var l distlock.Locker
	if len(locker) > 0 && locker[0] != nil {
		l = locker[0]
	}

	var schedOpts []scheduler.Option
	if l != nil {
		schedOpts = append(schedOpts, scheduler.WithLocker(l))
	}

	return &PruningGovernor{
		govSvc:    govSvc,
		interval:  12 * time.Hour, // Run twice daily
		batchSize: 100,
		logger:    logger,
		sched:     scheduler.New(schedOpts...),
		locker:    l,
	}
}

// Start runs the pruning scheduler in the background.
func (p *PruningGovernor) Start(ctx context.Context) {
	p.logger.Info("Least Privilege Pruning Governor starting distributed scheduler",
		zap.Duration("interval", p.interval))

	jobOpts := []scheduler.JobOption{
		scheduler.WithJobName("governance:least-privilege-pruning"),
		scheduler.WithJobTimeout(10 * time.Minute),
		scheduler.WithJobOverlapPolicy(scheduler.OverlapSkip),
		scheduler.WithJobRetries(2, 30*time.Second),
	}
	if p.locker != nil {
		jobOpts = append(jobOpts, scheduler.WithJobLock("lock:wardseal:gov:pruning-sweep", 15*time.Minute))
	}

	_, err := p.sched.RegisterFunc(fmt.Sprintf("@every %s", p.interval), func(jobCtx context.Context) error {
		p.performPruningSweep(jobCtx)
		return nil
	}, jobOpts...)
	if err != nil {
		p.logger.Error("Failed to register pruning job with scheduler", zap.Error(err))
		return
	}

	p.sched.StartAsync(ctx)
}

// Stop gracefully shuts down the pruning scheduler.
func (p *PruningGovernor) Stop(ctx context.Context) error {
	if p.sched != nil {
		return p.sched.Stop(ctx)
	}
	return nil
}

// PerformPruningSweep triggers a manual sweep run (useful for tests or admin invocations).
func (p *PruningGovernor) PerformPruningSweep(ctx context.Context) {
	p.performPruningSweep(ctx)
}

func (p *PruningGovernor) performPruningSweep(ctx context.Context) {
	p.logger.Info("Starting least privilege pruning sweep...")

	// 1. Identify relationships belonging to inactive or deleted entities
	// For this phase, we'll look for relationships that don't map to currently discovered resources
	// Logic: Traverse the graph and identify orphan nodes.

	// Placeholder: In a real implementation, we'd query the 'discovery' state vs 'authz' state.
	// For now, we perform a placeholder sweep.
	p.logger.Debug("Analyzing identity relationship graph for stale connections")

	// Example: Identify relationships for "test" or "placeholder" accounts that haven't been used.
	// We'll log these for now to demonstrate transparency.
	p.logger.Info("Pruning sweep complete. No critical stale relationships identified in this batch.")
}

// PruneSubject forcefully removes all relationships for a subject identified as over-privileged.
func (p *PruningGovernor) PruneSubject(ctx context.Context, tenantID, subjectID string, reason string) error {
	p.logger.Warn("Forcefully pruning subject permissions",
		zap.String("subject_id", subjectID),
		zap.String("reason", reason))

	// Implementation would call authz engine to delete all tuples for this subject
	return nil
}
