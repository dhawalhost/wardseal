package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// DeveloperAPIHandler handles developer portal API requests.
type DeveloperAPIHandler struct {
	appStore DeveloperAppStore
	db       *sqlx.DB
	logger   *zap.Logger
}

// NewDeveloperAPIHandler creates a new developer API handler.
func NewDeveloperAPIHandler(db *sqlx.DB, logger *zap.Logger) *DeveloperAPIHandler {
	return &DeveloperAPIHandler{
		appStore: NewDeveloperAppStore(db),
		db:       db,
		logger:   logger,
	}
}

// RegisterRoutes registers developer API routes.
func (h *DeveloperAPIHandler) RegisterRoutes(rg *gin.RouterGroup) {
	apps := rg.Group("/apps")
	{
		apps.GET("", h.listApps)
		apps.POST("", h.createApp)
		apps.GET("/:id", h.getApp)
		apps.PUT("/:id", h.updateApp)
		apps.DELETE("/:id", h.deleteApp)
		apps.POST("/:id/rotate-secret", h.rotateSecret)
	}

	keys := rg.Group("/api-keys")
	{
		keys.GET("", h.listAPIKeys)
		keys.POST("", h.createAPIKey)
		keys.DELETE("/:id", h.revokeAPIKey)
	}
}

// CreateAppRequest is the request to create a developer app.
type CreateAppRequest struct {
	Name         string   `json:"name" binding:"required"`
	Description  *string  `json:"description"`
	RedirectURIs []string `json:"redirect_uris"`
	AppType      string   `json:"app_type"`
	HomepageURL  *string  `json:"homepage_url"`
}

// AppResponse includes the client secret (only on create).
type AppResponse struct {
	DeveloperApp
	ClientSecret string `json:"client_secret,omitempty"`
}

func (h *DeveloperAPIHandler) listApps(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	ownerID := c.GetHeader("X-User-ID")
	if tenantID == "" || ownerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	apps, err := h.appStore.ListByOwner(c.Request.Context(), tenantID, ownerID)
	if err != nil {
		h.logger.Error("Failed to list apps", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list apps"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"apps": apps})
}

func (h *DeveloperAPIHandler) createApp(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	ownerID := c.GetHeader("X-User-ID")
	if tenantID == "" || ownerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var req CreateAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientSecret := generateClientSecret()
	app := &DeveloperApp{
		TenantID:    tenantID,
		OwnerID:     ownerID,
		Name:        req.Name,
		Description: req.Description,
		AppType:     req.AppType,
		HomepageURL: req.HomepageURL,
	}

	if len(req.RedirectURIs) > 0 {
		uris, _ := json.Marshal(req.RedirectURIs)
		app.RedirectURIs = uris
	}

	if err := h.appStore.Create(c.Request.Context(), app, clientSecret); err != nil {
		h.logger.Error("Failed to create app", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create app"})
		return
	}

	// Return app with secret (only shown once!)
	c.JSON(http.StatusCreated, AppResponse{
		DeveloperApp: *app,
		ClientSecret: clientSecret,
	})
}

func (h *DeveloperAPIHandler) getApp(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	appID := c.Param("id")

	app, err := h.appStore.Get(c.Request.Context(), tenantID, appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get app"})
		return
	}
	if app == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}

	c.JSON(http.StatusOK, app)
}

func (h *DeveloperAPIHandler) updateApp(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	appID := c.Param("id")

	existing, _ := h.appStore.Get(c.Request.Context(), tenantID, appID)
	if existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}

	var req CreateAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.HomepageURL = req.HomepageURL
	if len(req.RedirectURIs) > 0 {
		uris, _ := json.Marshal(req.RedirectURIs)
		existing.RedirectURIs = uris
	}

	if err := h.appStore.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update app"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

func (h *DeveloperAPIHandler) deleteApp(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	appID := c.Param("id")

	if err := h.appStore.Delete(c.Request.Context(), tenantID, appID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete app"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "app deleted"})
}

func (h *DeveloperAPIHandler) rotateSecret(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	appID := c.Param("id")

	newSecret, err := h.appStore.RotateSecret(c.Request.Context(), tenantID, appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to rotate secret"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "secret rotated successfully",
		"client_secret": newSecret,
	})
}

// ========== API Keys ==========

type APIKey struct {
	ID         string  `db:"id" json:"id"`
	TenantID   string  `db:"tenant_id" json:"tenant_id"`
	OwnerID    string  `db:"owner_id" json:"owner_id"`
	Name       string  `db:"name" json:"name"`
	KeyPrefix  string  `db:"key_prefix" json:"key_prefix"`
	KeyHash    string  `db:"key_hash" json:"-"`
	Status     string  `db:"status" json:"status"`
	CreatedAt  string  `db:"created_at" json:"created_at"`
	LastUsedAt *string `db:"last_used_at" json:"last_used_at,omitempty"`
}

type CreateAPIKeyRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *DeveloperAPIHandler) listAPIKeys(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	ownerID := c.GetHeader("X-User-ID")
	if tenantID == "" || ownerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var keys []APIKey
	query := `SELECT id, tenant_id, owner_id, name, key_prefix, status, created_at, last_used_at 
	          FROM api_keys WHERE tenant_id = $1 AND owner_id = $2 AND status = 'active' ORDER BY created_at DESC`
	if err := h.db.SelectContext(c.Request.Context(), &keys, query, tenantID, ownerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"api_keys": keys})
}

func (h *DeveloperAPIHandler) createAPIKey(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	ownerID := c.GetHeader("X-User-ID")
	if tenantID == "" || ownerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate API key
	keyBytes := make([]byte, 32)
	_, _ = rand.Read(keyBytes)
	fullKey := "vv_live_" + hex.EncodeToString(keyBytes)
	keyPrefix := fullKey[:16] + "..."

	hash, _ := bcrypt.GenerateFromPassword([]byte(fullKey), bcrypt.DefaultCost)

	query := `INSERT INTO api_keys (tenant_id, owner_id, name, key_prefix, key_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`
	var keyID string
	if err := h.db.QueryRowContext(c.Request.Context(), query, tenantID, ownerID, req.Name, keyPrefix, string(hash)).Scan(&keyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         keyID,
		"name":       req.Name,
		"key":        fullKey, // Only shown once!
		"key_prefix": keyPrefix,
		"message":    "Save this key now - it won't be shown again!",
	})
}

func (h *DeveloperAPIHandler) revokeAPIKey(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	keyID := c.Param("id")

	query := `UPDATE api_keys SET status = 'revoked' WHERE tenant_id = $1 AND id = $2`
	if _, err := h.db.ExecContext(c.Request.Context(), query, tenantID, keyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "API key revoked"})
}
