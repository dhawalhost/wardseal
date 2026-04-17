package saml

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler handles SAML SP management requests.
type HTTPHandler struct {
	store  *Store
	logger *zap.Logger
}

// NewHTTPHandler creates a new SAML HTTP handler.
func NewHTTPHandler(store *Store, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{store: store, logger: logger}
}

// Router registers SAML management routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Get("/providers", h.listProviders)
	r.Post("/providers", h.createProvider)
	r.Get("/providers/{entityID}", h.getProvider)
	r.Delete("/providers/{entityID}", h.deleteProvider)

	return r
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) listProviders(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var providers []ServiceProvider
	err := h.store.db.WithContext(r.Context()).Raw("SELECT * FROM saml_providers WHERE tenant_id = ?", tenantID).Scan(&providers).Error
	if err != nil {
		h.logger.Error("Failed to list providers", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]interface{}{"providers": providers})
}

func (h *HTTPHandler) createProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var input ServiceProvider
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	input.TenantID = tenantID
	input.CreatedAt = time.Now()
	input.UpdatedAt = time.Now()

	err := h.store.db.WithContext(r.Context()).Exec(
		`INSERT INTO saml_providers (entity_id, tenant_id, metadata_url, acs_url, certificate, created_at, updated_at) 
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		input.EntityID, input.TenantID, input.MetadataURL, input.ACSURL, input.Certificate, input.CreatedAt, input.UpdatedAt).Error

	if err != nil {
		h.logger.Error("Failed to create provider", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.JSON(w, r, http.StatusCreated, input)
}

func (h *HTTPHandler) getProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}
	entityID := chi.URLParam(r, "entityID")

	var sp ServiceProvider
	err := h.store.db.WithContext(r.Context()).Raw("SELECT * FROM saml_providers WHERE entity_id = ? AND tenant_id = ?", entityID, tenantID).Scan(&sp).Error
	if err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "provider not found"})
		return
	}

	response.Ok(w, r, sp)
}

func (h *HTTPHandler) deleteProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}
	entityID := chi.URLParam(r, "entityID")

	err := h.store.db.WithContext(r.Context()).Exec("DELETE FROM saml_providers WHERE entity_id = ? AND tenant_id = ?", entityID, tenantID).Error
	if err != nil {
		h.logger.Error("Failed to delete provider", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.NoContent(w)
}
