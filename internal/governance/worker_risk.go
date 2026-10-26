package governance

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/dhawalhost/gokit/distlock"
	"github.com/dhawalhost/gokit/scheduler"
	"github.com/dhawalhost/wardseal/internal/auth"
	"github.com/dhawalhost/wardseal/internal/connector"
)

// RiskGovernor monitors user risk levels and triggers autonomous mitigation
// using a distributed scheduler.
type RiskGovernor struct {
	signalStore auth.SignalRepository
	provSvc     connector.ProvisioningService
	govSvc      Service
	interval    time.Duration
	threshold   int
	logger      *zap.Logger
	sched       *scheduler.Scheduler
	locker      distlock.Locker
}

// NewRiskGovernor creates a new autonomous risk governor.
func NewRiskGovernor(
	signalStore auth.SignalRepository,
	provSvc connector.ProvisioningService,
	govSvc Service,
	logger *zap.Logger,
	locker ...distlock.Locker,
) *RiskGovernor {
	var l distlock.Locker
	if len(locker) > 0 && locker[0] != nil {
		l = locker[0]
	}

	var schedOpts []scheduler.Option
	if l != nil {
		schedOpts = append(schedOpts, scheduler.WithLocker(l))
	}

	return &RiskGovernor{
		signalStore: signalStore,
		provSvc:     provSvc,
		govSvc:      govSvc,
		interval:    5 * time.Minute, // Sweep every 5 minutes
		threshold:   90,              // Critical threshold for autonomous action
		logger:      logger,
		sched:       scheduler.New(schedOpts...),
		locker:      l,
	}
}

// Start runs the risk governor distributed scheduler in the background.
func (g *RiskGovernor) Start(ctx context.Context) {
	g.logger.Info("Autonomous Risk Governor starting distributed scheduler",
		zap.Duration("interval", g.interval),
		zap.Int("threshold", g.threshold))

	jobOpts := []scheduler.JobOption{
		scheduler.WithJobName("governance:autonomous-risk-sweep"),
		scheduler.WithJobTimeout(5 * time.Minute),
		scheduler.WithJobOverlapPolicy(scheduler.OverlapSkip),
		scheduler.WithJobRetries(2, 15*time.Second),
	}
	if g.locker != nil {
		jobOpts = append(jobOpts, scheduler.WithJobLock("lock:wardseal:gov:risk-sweep", 5*time.Minute))
	}

	_, err := g.sched.RegisterFunc(fmt.Sprintf("@every %s", g.interval), func(jobCtx context.Context) error {
		g.performSweep(jobCtx)
		return nil
	}, jobOpts...)
	if err != nil {
		g.logger.Error("Failed to register risk sweep job with scheduler", zap.Error(err))
		return
	}

	g.sched.StartAsync(ctx)
}

// Stop gracefully shuts down the risk governor scheduler.
func (g *RiskGovernor) Stop(ctx context.Context) error {
	if g.sched != nil {
		return g.sched.Stop(ctx)
	}
	return nil
}

// PerformSweep triggers a manual sweep run (useful for tests or manual invocations).
func (g *RiskGovernor) PerformSweep(ctx context.Context) {
	g.performSweep(ctx)
}

func (g *RiskGovernor) performSweep(ctx context.Context) {
	g.logger.Debug("Risk governor performing sweep for critical accounts...")

	// In a multi-tenant world, we might iterate over active tenants.
	// For now, we query across all but we'll implement per-tenant logic if needed.
	// Since GetHighRiskUsers takes tenantID, we need a way to find active tenants.
	// For this Phase 3 delivery, we assume the signal store can return high risk users
	// globally if tenantID is empty, or we iterate.

	users, err := g.signalStore.GetHighRiskUsers(ctx, "", g.threshold)
	if err != nil {
		g.logger.Error("Failed to fetch high risk users", zap.Error(err))
		return
	}

	if len(users) == 0 {
		return
	}

	g.logger.Warn("Identified high-risk users requiring autonomous mitigation", zap.Int("count", len(users)))

	for _, user := range users {
		g.mitigateUser(ctx, user)
	}
}

func (g *RiskGovernor) mitigateUser(ctx context.Context, risk auth.UserRisk) {
	g.logger.Info("MITIGATING: Autonomous lockdown triggered for user",
		zap.String("user_id", risk.UserID),
		zap.Int("score", risk.Score))

	// 1. Invalidate local sessions (future deliverable in authsvc)

	// 2. Automate offboarding in ALL connected connectors
	// We iterate through all connectors configured for this tenant
	// and enqueue a 'delete_user' (which translates to deactivation for Slack).

	// Note: We need a way to list connectors for a tenant.
	// For the purpose of this autonomous pillar, we'll assume the provSvc
	// can find the mappings or we fetch them here.

	// Enqueue a "Global Deactivation" task
	taskID, err := g.provSvc.EnqueueTask(ctx, connector.ProvisioningTask{
		TenantID:     risk.TenantID,
		Operation:    "delete_user",
		ResourceType: "user",
		ResourceID:   risk.UserID,
		Payload: map[string]interface{}{
			"reason":  fmt.Sprintf("Autonomous lockdown: Score %d", risk.Score),
			"factors": risk.Factors,
		},
		Status: "pending",
	})

	if err != nil {
		g.logger.Error("Failed to enqueue autonomous mitigation task",
			zap.String("user_id", risk.UserID), zap.Error(err))
	} else {
		g.logger.Info("Mitigation task enqueued", zap.String("task_id", taskID))
	}

	// 3. Log as Safety Action for audit visibility
	if g.govSvc != nil {
		_, _ = g.govSvc.ProposeSafetyAction(ctx, risk.TenantID, ProposeSafetyActionInput{
			ActionType: "autonomous_lockdown",
			TargetID:   risk.UserID,
			Reason:     fmt.Sprintf("Autonomous lockdown triggered: Score %d", risk.Score),
		})
	}
}
