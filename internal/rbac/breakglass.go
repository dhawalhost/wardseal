package rbac

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/middleware"
)

// BreakGlassRequest elevates a user to super-admin for a limited duration.
type BreakGlassRequest struct {
	UserID   string `json:"user_id" binding:"required"`
	Reason   string `json:"reason" binding:"required"`
	Duration string `json:"duration"` // Go duration, default 1h, max 8h
}

// RegisterBreakGlassRoutes mounts emergency elevation under an authenticated group.
// Callers must already hold roles:write (typically super-admin).
func (h *HTTPHandler) RegisterBreakGlassRoutes(rg *gin.RouterGroup, checker middleware.PermissionChecker) {
	write := middleware.RequirePermission(checker, "roles", "write")
	rg.POST("/break-glass/elevate", write, h.elevateBreakGlass)
}

func (h *HTTPHandler) elevateBreakGlass(c *gin.Context) {
	tenantID, ok := h.tenantID(c)
	if !ok {
		return
	}

	var req BreakGlassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and reason are required"})
		return
	}
	req.Reason = strings.TrimSpace(req.Reason)
	if len(req.Reason) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reason must be at least 8 characters"})
		return
	}

	duration := req.Duration
	if duration == "" {
		duration = "1h"
	}
	d, err := time.ParseDuration(duration)
	if err != nil || d <= 0 || d > 8*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "duration must be a valid Go duration up to 8h"})
		return
	}

	roles, err := h.svc.ListRoles(c.Request.Context(), tenantID)
	if err != nil {
		h.logger.Error("break-glass list roles failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve roles"})
		return
	}
	var superAdminID string
	for _, r := range roles {
		if r.Name == "super-admin" {
			superAdminID = r.ID
			break
		}
	}
	if superAdminID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "super-admin role not found"})
		return
	}

	actor, _ := c.Get("user_id")
	actorID, _ := actor.(string)
	assignedBy := &actorID
	if err := h.svc.AssignRoleWithExpiration(c.Request.Context(), tenantID, req.UserID, superAdminID, assignedBy, duration); err != nil {
		h.logger.Error("break-glass elevation failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to elevate user"})
		return
	}

	h.logger.Warn("break-glass elevation granted",
		zap.String("tenant_id", tenantID),
		zap.String("actor_id", actorID),
		zap.String("target_user_id", req.UserID),
		zap.String("reason", req.Reason),
		zap.String("duration", duration),
		zap.Time("expires_at", time.Now().Add(d)),
	)

	c.JSON(http.StatusCreated, gin.H{
		"status":     "elevated",
		"user_id":    req.UserID,
		"role":       "super-admin",
		"duration":   duration,
		"expires_at": time.Now().Add(d).UTC().Format(time.RFC3339),
		"reason":     req.Reason,
	})
}
