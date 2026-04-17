package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// DeveloperAPIHandler handles developer portal API requests.
type DeveloperAPIHandler struct {
	appStore DeveloperAppRepository
	db       *gorm.DB
	logger   *zap.Logger
}

// NewDeveloperAPIHandler creates a new developer API handler.
func NewDeveloperAPIHandler(db *gorm.DB, logger *zap.Logger) *DeveloperAPIHandler {
	return &DeveloperAPIHandler{
		appStore: NewDeveloperAppRepository(db),
		db:       db,
		logger:   logger,
	}
}

// Router registers developer API routes.
func (h *DeveloperAPIHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Route("/apps", func(r chi.Router) {
		r.Get("/", h.listApps)
		r.Post("/", h.createApp)
		r.Get("/{id}", h.getApp)
		r.Put("/{id}", h.updateApp)
		r.Delete("/{id}", h.deleteApp)
		r.Post("/{id}/rotate-secret", h.rotateSecret)
		r.Get("/{id}/logs", h.getAppLogs)

		// Assignment Routes
		r.Get("/{id}/assignments", h.listAssignedUsers)
		r.Post("/{id}/assignments", h.assignUserToApp)
		r.Delete("/{id}/assignments/{user_id}", h.unassignUserFromApp)
	})

	r.Route("/api-keys", func(r chi.Router) {
		r.Get("/", h.listAPIKeys)
		r.Post("/", h.createAPIKey)
		r.Delete("/{id}", h.revokeAPIKey)
		r.Get("/{id}/logs", h.getAPIKeyLogs)
	})

	r.Route("/developer", func(r chi.Router) {
		r.Get("/analytics", h.getDeveloperAnalytics)
	})

	return r
}

// CreateAppRequest is the request to create a developer app.
type CreateAppRequest struct {
	Name         string   `json:"name" validate:"required"`
	Description  *string  `json:"description"`
	RedirectURIs []string `json:"redirect_uris"`
	GrantTypes   []string `json:"grant_types"`
	Scopes       []string `json:"scopes"`
	AppType      string   `json:"app_type"`
	HomepageURL  *string  `json:"homepage_url"`
}

// AppResponse includes the client secret (only on create).
type AppResponse struct {
	DeveloperApp
	ClientSecret string `json:"client_secret,omitempty"`
}

// APIKey model
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
	Name string `json:"name" validate:"required"`
}

type APILog struct {
	ID              string `db:"id" json:"id"`
	TenantID        string `db:"tenant_id" json:"-"`
	ClientID        string `db:"client_id" json:"client_id"`
	Method          string `db:"method" json:"method"`
	Path            string `db:"path" json:"path"`
	StatusCode      int    `db:"status_code" json:"status_code"`
	LatencyMs       int    `db:"latency_ms" json:"latency_ms"`
	IPAddress       string `db:"ip_address" json:"ip_address"`
	RequestPayload  string `db:"request_payload" json:"request_payload"`
	ResponsePayload string `db:"response_payload" json:"response_payload"`
	CreatedAt       string `db:"created_at" json:"created_at"`
}

type AssignUserRequest struct {
	UserID string `json:"user_id" validate:"required"`
}

func (h *DeveloperAPIHandler) tenantAndUser(r *http.Request) (string, string, bool) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	userID, _ := middleware.UserIDFromContext(r.Context())

	// If not in context, try headers as fallback (some legacy tests/clients)
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	if userID == "" {
		userID = r.Header.Get("X-User-ID")
	}

	if tenantID == "" || userID == "" {
		return "", "", false
	}
	return tenantID, userID, true
}

func (h *DeveloperAPIHandler) listApps(w http.ResponseWriter, r *http.Request) {
	tenantID, ownerID, ok := h.tenantAndUser(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	apps, err := h.appStore.ListByOwner(r.Context(), tenantID, ownerID)
	if err != nil {
		h.logger.Error("Failed to list apps", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list apps"})
		return
	}

	response.JSON(w, r, http.StatusOK, map[string]interface{}{"apps": apps})
}

func (h *DeveloperAPIHandler) createApp(w http.ResponseWriter, r *http.Request) {
	tenantID, ownerID, ok := h.tenantAndUser(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var req CreateAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
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
	if len(req.GrantTypes) > 0 {
		grantTypes, _ := json.Marshal(req.GrantTypes)
		app.GrantTypes = grantTypes
	}
	if len(req.Scopes) > 0 {
		scopes, _ := json.Marshal(req.Scopes)
		app.Scopes = scopes
	}

	if err := h.appStore.Create(r.Context(), app, clientSecret); err != nil {
		h.logger.Error("Failed to create app", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to create app"})
		return
	}

	if err := h.appStore.AssignUserToApp(r.Context(), tenantID, app.ID, ownerID); err != nil {
		h.logger.Error("Failed to assign app owner", zap.Error(err), zap.String("tenantID", tenantID), zap.String("appID", app.ID), zap.String("ownerID", ownerID))
		_ = h.appStore.Delete(r.Context(), tenantID, app.ID)
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to initialize app assignment"})
		return
	}

	// Return app with secret (only shown once!)
	response.JSON(w, r, http.StatusCreated, AppResponse{
		DeveloperApp: *app,
		ClientSecret: clientSecret,
	})
}

func (h *DeveloperAPIHandler) getApp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	app, err := h.appStore.Get(r.Context(), tenantID, appID)
	if err != nil {
		h.logger.Error("Failed to get app", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to get app"})
		return
	}
	if app == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "app not found"})
		return
	}

	response.Ok(w, r, app)
}

func (h *DeveloperAPIHandler) updateApp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	existing, _ := h.appStore.Get(r.Context(), tenantID, appID)
	if existing == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "app not found"})
		return
	}

	var req CreateAppRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.HomepageURL = req.HomepageURL
	if len(req.RedirectURIs) > 0 {
		uris, _ := json.Marshal(req.RedirectURIs)
		existing.RedirectURIs = uris
	}
	if len(req.GrantTypes) > 0 {
		grantTypes, _ := json.Marshal(req.GrantTypes)
		existing.GrantTypes = grantTypes
	}
	if len(req.Scopes) > 0 {
		scopes, _ := json.Marshal(req.Scopes)
		existing.Scopes = scopes
	}

	if err := h.appStore.Update(r.Context(), existing); err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to update app"})
		return
	}

	response.Ok(w, r, existing)
}

func (h *DeveloperAPIHandler) deleteApp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	if err := h.appStore.Delete(r.Context(), tenantID, appID); err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to delete app"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "app deleted"})
}

func (h *DeveloperAPIHandler) rotateSecret(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	newSecret, err := h.appStore.RotateSecret(r.Context(), tenantID, appID)
	if err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to rotate secret"})
		return
	}

	response.Ok(w, r, map[string]string{
		"message":       "secret rotated successfully",
		"client_secret": newSecret,
	})
}

func (h *DeveloperAPIHandler) listAPIKeys(w http.ResponseWriter, r *http.Request) {
	tenantID, ownerID, ok := h.tenantAndUser(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var keys []APIKey
	query := `SELECT id, tenant_id, owner_id, name, key_prefix, status, created_at, last_used_at 
	          FROM api_keys WHERE tenant_id = ? AND owner_id = ? AND status = 'active' ORDER BY created_at DESC`
	if err := h.db.WithContext(r.Context()).Raw(query, tenantID, ownerID).Scan(&keys).Error; err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list API keys"})
		return
	}

	response.JSON(w, r, http.StatusOK, map[string]interface{}{"api_keys": keys})
}

func (h *DeveloperAPIHandler) createAPIKey(w http.ResponseWriter, r *http.Request) {
	tenantID, ownerID, ok := h.tenantAndUser(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}

	var req CreateAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Generate API key
	keyBytes := make([]byte, 32)
	_, _ = rand.Read(keyBytes)
	fullKey := "vv_live_" + hex.EncodeToString(keyBytes)
	keyPrefix := fullKey[:16] + "..."

	hash, _ := bcrypt.GenerateFromPassword([]byte(fullKey), bcrypt.DefaultCost)

	query := `INSERT INTO api_keys (tenant_id, owner_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?) RETURNING id`
	var keyID string
	if err := h.db.WithContext(r.Context()).Raw(query, tenantID, ownerID, req.Name, keyPrefix, string(hash)).Scan(&keyID).Error; err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to create API key"})
		return
	}

	response.JSON(w, r, http.StatusCreated, map[string]interface{}{
		"id":         keyID,
		"name":       req.Name,
		"key":        fullKey, // Only shown once!
		"key_prefix": keyPrefix,
		"message":    "Save this key now - it won't be shown again!",
	})
}

func (h *DeveloperAPIHandler) revokeAPIKey(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	keyID := chi.URLParam(r, "id")

	query := `UPDATE api_keys SET status = 'revoked' WHERE tenant_id = ? AND id = ?`
	if err := h.db.WithContext(r.Context()).Exec(query, tenantID, keyID).Error; err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to revoke API key"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "API key revoked"})
}

func (h *DeveloperAPIHandler) getAppLogs(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	app, err := h.appStore.Get(r.Context(), tenantID, appID)
	if err != nil || app == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "app not found"})
		return
	}

	var logs []APILog
	query := `SELECT id, client_id, method, path, status_code, latency_ms, ip_address, 
	          COALESCE(request_payload::text, '{}') as request_payload, 
	          COALESCE(response_payload::text, '{}') as response_payload, created_at
	          FROM api_logs WHERE tenant_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 50`
	if err := h.db.WithContext(r.Context()).Raw(query, tenantID, app.ClientID).Scan(&logs).Error; err != nil {
		h.logger.Error("Failed to fetch app logs", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to fetch app logs"})
		return
	}
	if logs == nil {
		logs = make([]APILog, 0)
	}
	response.JSON(w, r, http.StatusOK, map[string]interface{}{"logs": logs})
}

func (h *DeveloperAPIHandler) getAPIKeyLogs(w http.ResponseWriter, r *http.Request) {
	tenantID, ownerID, ok := h.tenantAndUser(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID and X-User-ID headers required"})
		return
	}
	keyID := chi.URLParam(r, "id")

	var keyPrefix string
	queryCheck := `SELECT key_prefix FROM api_keys WHERE id = ? AND tenant_id = ? AND owner_id = ?`
	if err := h.db.WithContext(r.Context()).Raw(queryCheck, keyID, tenantID, ownerID).Scan(&keyPrefix).Error; err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "api key not found"})
		return
	}

	var logs []APILog
	query := `SELECT id, client_id, method, path, status_code, latency_ms, ip_address, 
	          COALESCE(request_payload::text, '{}') as request_payload, 
	          COALESCE(response_payload::text, '{}') as response_payload, created_at
	          FROM api_logs WHERE tenant_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 50`
	if err := h.db.WithContext(r.Context()).Raw(query, tenantID, keyPrefix).Scan(&logs).Error; err != nil {
		h.logger.Error("Failed to fetch api key logs", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to fetch logs"})
		return
	}
	if logs == nil {
		logs = make([]APILog, 0)
	}
	response.JSON(w, r, http.StatusOK, map[string]interface{}{"logs": logs})
}

func (h *DeveloperAPIHandler) getDeveloperAnalytics(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}

	// Global tenant-level analytics (for the frontend dashboard chart)
	type AnalyticPoint struct {
		Date       string `db:"log_date" json:"date"`
		TotalCalls int    `db:"total_calls" json:"total_calls"`
		AvgLatency int    `db:"avg_latency" json:"avg_latency"`
		Errors     int    `db:"errors" json:"errors"`
	}

	var data []AnalyticPoint
	query := `
		SELECT 
			DATE(created_at) as log_date,
			COUNT(*) as total_calls,
			COALESCE(AVG(latency_ms), 0)::int as avg_latency,
			SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
		FROM api_logs 
		WHERE tenant_id = ? AND created_at >= NOW() - INTERVAL '7 days'
		GROUP BY log_date
		ORDER BY log_date ASC
	`
	if err := h.db.WithContext(r.Context()).Raw(query, tenantID).Scan(&data).Error; err != nil {
		h.logger.Error("Failed to fetch analytics", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to fetch analytics"})
		return
	}

	if data == nil {
		data = make([]AnalyticPoint, 0)
	}
	response.JSON(w, r, http.StatusOK, map[string]interface{}{"analytics": data})
}

func (h *DeveloperAPIHandler) listAssignedUsers(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	if tenantID == "" || appID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID header and Application ID required"})
		return
	}

	users, err := h.appStore.ListAssignedUsers(r.Context(), tenantID, appID)
	if err != nil {
		h.logger.Error("Failed to list assigned users", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list assigned users"})
		return
	}

	if users == nil {
		users = make([]string, 0)
	}

	response.JSON(w, r, http.StatusOK, map[string]interface{}{"users": users})
}

func (h *DeveloperAPIHandler) assignUserToApp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")

	if tenantID == "" || appID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID header and Application ID required"})
		return
	}

	var req AssignUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.appStore.AssignUserToApp(r.Context(), tenantID, appID, req.UserID)
	if err != nil {
		h.logger.Error("Failed to assign user to app", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to assign user"})
		return
	}

	response.JSON(w, r, http.StatusCreated, map[string]string{"message": "User assigned to application"})
}

func (h *DeveloperAPIHandler) unassignUserFromApp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantIDFromContext(r.Context())
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	appID := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "user_id")

	if tenantID == "" || appID == "" || userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "X-Tenant-ID header, Application ID, and User ID required"})
		return
	}

	err := h.appStore.UnassignUserFromApp(r.Context(), tenantID, appID, userID)
	if err != nil {
		h.logger.Error("Failed to unassign user from app", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to unassign user"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "User unassigned from application"})
}
