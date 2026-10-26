package directory

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/dhawalhost/gokit/distlock"
	"github.com/dhawalhost/gokit/scheduler"
)

// StartAccountErasureWorker starts a distributed scheduler that periodically
// polls for users in pending_deletion status whose updated_at timestamp is older
// than the retention period, and permanently deletes them.
func StartAccountErasureWorker(
	ctx context.Context,
	svc Service,
	log *zap.Logger,
	checkInterval time.Duration,
	retentionPeriod time.Duration,
	locker ...distlock.Locker,
) *scheduler.Scheduler {
	var l distlock.Locker
	if len(locker) > 0 && locker[0] != nil {
		l = locker[0]
	}

	var schedOpts []scheduler.Option
	if l != nil {
		schedOpts = append(schedOpts, scheduler.WithLocker(l))
	}

	sched := scheduler.New(schedOpts...)

	jobOpts := []scheduler.JobOption{
		scheduler.WithJobName("directory:dpdp-account-erasure"),
		scheduler.WithJobTimeout(checkInterval),
		scheduler.WithJobOverlapPolicy(scheduler.OverlapSkip),
		scheduler.WithJobRetries(2, 30*time.Second),
	}
	if l != nil {
		jobOpts = append(jobOpts, scheduler.WithJobLock("lock:wardseal:dir:account-erasure", checkInterval))
	}

	_, err := sched.RegisterFunc(fmt.Sprintf("@every %s", checkInterval), func(jobCtx context.Context) error {
		runAccountErasureJob(jobCtx, svc, log, retentionPeriod)
		return nil
	}, jobOpts...)
	if err != nil {
		log.Error("Failed to register account erasure job with scheduler", zap.Error(err))
		return nil
	}

	log.Info("Account erasure distributed scheduler started",
		zap.Duration("check_interval", checkInterval),
		zap.Duration("retention_period", retentionPeriod))

	sched.StartAsync(ctx)
	return sched
}

func runAccountErasureJob(ctx context.Context, svc Service, log *zap.Logger, retentionPeriod time.Duration) {
	olderThan := time.Now().Add(-retentionPeriod)
	users, err := svc.ListPendingDeletions(ctx, olderThan)
	if err != nil {
		log.Error("Failed to list pending deletions", zap.Error(err))
		return
	}

	if len(users) == 0 {
		return
	}

	log.Info("Starting account erasure job", zap.Int("pending_users_count", len(users)))

	for _, user := range users {
		log.Info("Permanently erasing account", zap.String("user_id", user.ID), zap.String("tenant_id", user.TenantID))
		if err := svc.DeleteUser(ctx, user.TenantID, user.ID); err != nil {
			log.Error("Failed to permanently delete user", zap.String("user_id", user.ID), zap.Error(err))
		}
	}
}
