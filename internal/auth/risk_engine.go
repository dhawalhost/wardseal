package auth

import (
	"context"
	"time"

	"go.uber.org/zap"
)

// RiskLevel enum
type RiskLevel string

const (
	RiskLevelLow    RiskLevel = "LOW"
	RiskLevelMedium RiskLevel = "MEDIUM"
	RiskLevelHigh   RiskLevel = "HIGH"
)

// RiskScore represents the calculated risk.
type RiskScore struct {
	Score   int       `json:"score"` // 0-100
	Level   RiskLevel `json:"level"`
	Factors []string  `json:"factors"`
}

// RiskEngine evaluates authentication risk.
type RiskEngine struct {
	deviceStore DeviceStore
	signalStore SignalStore
	logger      *zap.Logger
}

func NewRiskEngine(deviceStore DeviceStore, signalStore SignalStore, logger *zap.Logger) *RiskEngine {
	return &RiskEngine{
		deviceStore: deviceStore,
		signalStore: signalStore,
		logger:      logger,
	}
}

// Evaluate calculates the risk score for a login attempt.
func (e *RiskEngine) Evaluate(ctx context.Context, userID, deviceID, ip string) (RiskScore, error) {
	score := 0
	factors := []string{}

	// 1. Device Posture Check
	if deviceID != "" {
		// Fetch device
		// We need tenantID to be safe, but Login usually happens with just username/password first to find user.
		// However, our Login flow expects TenantID in context/header.
		// Assuming tenantID is in context from middleware.
		// Since DeviceStore implementation uses ID directly (UUID), we can fetch by ID if we trust the client sent the right ID.
		// Alternatively, look up by identifier? The header X-Device-ID implies the UUID or the Identifier.
		// Let's assume it's the internal ID (UUID) for now as that's what the API would likely send after registration.
		device, err := e.deviceStore.GetByID(ctx, deviceID)
		if err != nil {
			e.logger.Error("Failed to fetch device for risk eval", zap.Error(err))
			// Fail open or closed? Let's add risk for "unknown error" or treating as unknown device
			score += 20
			factors = append(factors, "device_lookup_error")
		} else if device == nil {
			score += 20
			factors = append(factors, "unknown_device")
		} else {
			// Device found
			if !device.IsCompliant {
				score += 50
				factors = append(factors, "device_non_compliant")
			}
			if device.RiskScore > 0 {
				score += device.RiskScore
				factors = append(factors, "device_reported_risk")
			}
		}
	} else {
		// No device ID provided - could be a new device or browser
		score += 10
		factors = append(factors, "no_device_id")
	}

	// 2. Signal Check (CAE events in last 24h)
	// Check for critical events like credential change
	if e.signalStore != nil {
		since := time.Now().Add(-24 * time.Hour)
		event, err := e.signalStore.GetLatestCriticalEvent(ctx, userID, since)
		if err == nil && event != nil {
			// If there was a critical event recently, increase risk
			score += 30
			factors = append(factors, "recent_security_event: "+event.EventType)
		}
	}

	// Cap score at 100
	if score > 100 {
		score = 100
	}

	// Determine Level
	level := RiskLevelLow
	if score >= 80 {
		level = RiskLevelHigh
	} else if score >= 40 {
		level = RiskLevelMedium
	}

	return RiskScore{
		Score:   score,
		Level:   level,
		Factors: factors,
	}, nil
}
