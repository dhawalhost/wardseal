package connector

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ProvisioningService manages async provisioning tasks.
type ProvisioningService struct {
	db       *gorm.DB
	registry Registry
	logger   *zap.Logger
}

// NewProvisioningService creates a new provisioning service.
func NewProvisioningService(db *gorm.DB, registry Registry, logger *zap.Logger) *ProvisioningService {
	return &ProvisioningService{
		db:       db,
		registry: registry,
		logger:   logger,
	}
}

// EnqueueTask adds a provisioning task to the queue.
func (s *ProvisioningService) EnqueueTask(ctx context.Context, task ProvisioningTask) (string, error) {
	payloadBytes, err := json.Marshal(task.Payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	row := taskRow{
		TenantID:     task.TenantID,
		ConnectorID:  task.ConnectorID,
		Operation:    task.Operation,
		ResourceType: task.ResourceType,
		ResourceID:   &task.ResourceID,
		Payload:      payloadBytes,
		MaxRetries:   task.MaxRetries,
		Status:       "pending",
		ScheduledAt:  time.Now(),
	}

	if err := s.db.WithContext(ctx).Table("provisioning_tasks").Create(&row).Error; err != nil {
		return "", fmt.Errorf("failed to enqueue task: %w", err)
	}

	s.logger.Info("Provisioning task enqueued",
		zap.String("task_id", row.ID),
		zap.String("operation", task.Operation),
		zap.String("connector_id", task.ConnectorID),
	)
	return row.ID, nil
}

// GetTask retrieves a task by ID.
func (s *ProvisioningService) GetTask(ctx context.Context, tenantID, taskID string) (ProvisioningTask, error) {
	var r taskRow
	err := s.db.WithContext(ctx).Table("provisioning_tasks").
		Where("id = ? AND tenant_id = ?", taskID, tenantID).
		First(&r).Error
	if err != nil {
		return ProvisioningTask{}, err
	}
	return r.toTask(), nil
}

// ListPendingTasks returns tasks that are ready to be processed.
func (s *ProvisioningService) ListPendingTasks(ctx context.Context, limit int) ([]ProvisioningTask, error) {
	var rows []taskRow
	err := s.db.WithContext(ctx).Table("provisioning_tasks").
		Where("status = ? AND scheduled_at <= ?", "pending", time.Now()).
		Order("scheduled_at").
		Limit(limit).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	tasks := make([]ProvisioningTask, len(rows))
	for i, r := range rows {
		tasks[i] = r.toTask()
	}
	return tasks, nil
}

// ProcessTask executes a single provisioning task.
func (s *ProvisioningService) ProcessTask(ctx context.Context, taskID string) error {
	// Mark as processing
	err := s.db.WithContext(ctx).Table("provisioning_tasks").
		Where("id = ?", taskID).
		Update("status", "processing").Error
	if err != nil {
		return err
	}

	// Get task
	var r taskRow
	if err := s.db.WithContext(ctx).Table("provisioning_tasks").Where("id = ?", taskID).First(&r).Error; err != nil {
		return err
	}
	task := r.toTask()

	// Get connector
	conn, ok := s.registry.Get(task.ConnectorID)
	if !ok {
		return s.failTask(ctx, taskID, "connector not found")
	}

	// Execute operation
	execErr := s.executeOperation(ctx, conn, task)
	if execErr != nil {
		// Handle retry
		if task.RetryCount < task.MaxRetries {
			backoff := time.Duration(1<<task.RetryCount) * time.Minute // Exponential backoff
			update := map[string]interface{}{
				"status":        "pending",
				"retry_count":   gorm.Expr("retry_count + 1"),
				"scheduled_at":  time.Now().Add(backoff),
				"error_message": execErr.Error(),
			}
			if err := s.db.WithContext(ctx).Table("provisioning_tasks").Where("id = ?", taskID).Updates(update).Error; err != nil {
				return err
			}
			return nil
		}
		return s.failTask(ctx, taskID, execErr.Error())
	}

	// Mark as completed
	err = s.db.WithContext(ctx).Table("provisioning_tasks").
		Where("id = ?", taskID).
		Updates(map[string]interface{}{
			"status":       "completed",
			"processed_at": time.Now(),
		}).Error
	return err
}

func (s *ProvisioningService) failTask(ctx context.Context, taskID, errMsg string) error {
	err := s.db.WithContext(ctx).Table("provisioning_tasks").
		Where("id = ?", taskID).
		Updates(map[string]interface{}{
			"status":        "failed",
			"error_message": errMsg,
			"processed_at":  time.Now(),
		}).Error
	return err
}

func (s *ProvisioningService) executeOperation(ctx context.Context, conn Connector, task ProvisioningTask) error {
	switch task.Operation {
	case "create_user":
		var user User
		if b, ok := task.Payload.([]byte); ok {
			if err := json.Unmarshal(b, &user); err != nil {
				return err
			}
		}
		_, err := conn.CreateUser(ctx, user)
		return err

	case "update_user":
		var user User
		if b, ok := task.Payload.([]byte); ok {
			if err := json.Unmarshal(b, &user); err != nil {
				return err
			}
		}
		return conn.UpdateUser(ctx, task.ResourceID, user)

	case "delete_user":
		return conn.DeleteUser(ctx, task.ResourceID)

	case "add_to_group":
		var payload struct {
			UserID  string `json:"user_id"`
			GroupID string `json:"group_id"`
		}
		if b, ok := task.Payload.([]byte); ok {
			if err := json.Unmarshal(b, &payload); err != nil {
				return err
			}
		}
		return conn.AddUserToGroup(ctx, payload.UserID, payload.GroupID)

	case "remove_from_group":
		var payload struct {
			UserID  string `json:"user_id"`
			GroupID string `json:"group_id"`
		}
		if b, ok := task.Payload.([]byte); ok {
			if err := json.Unmarshal(b, &payload); err != nil {
				return err
			}
		}
		return conn.RemoveUserFromGroup(ctx, payload.UserID, payload.GroupID)

	default:
		return fmt.Errorf("unknown operation: %s", task.Operation)
	}
}

// taskRow represents a DB row.
type taskRow struct {
	ID           string `gorm:"primaryKey;default:gen_random_uuid()"`
	TenantID     string
	ConnectorID  string
	Operation    string
	ResourceType string
	ResourceID   *string
	Payload      []byte
	Status       string
	ErrorMessage *string
	RetryCount   int
	MaxRetries   int
	CreatedAt    time.Time
	ProcessedAt  *time.Time
	ScheduledAt  time.Time
}

func (r taskRow) toTask() ProvisioningTask {
	t := ProvisioningTask{
		ID:           r.ID,
		TenantID:     r.TenantID,
		ConnectorID:  r.ConnectorID,
		Operation:    r.Operation,
		ResourceType: r.ResourceType,
		Payload:      r.Payload,
		Status:       r.Status,
		RetryCount:   r.RetryCount,
		MaxRetries:   r.MaxRetries,
		CreatedAt:    r.CreatedAt,
		ProcessedAt:  r.ProcessedAt,
	}
	if r.ResourceID != nil {
		t.ResourceID = *r.ResourceID
	}
	if r.ErrorMessage != nil {
		t.ErrorMessage = *r.ErrorMessage
	}
	return t
}
