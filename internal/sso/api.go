package sso

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler handles SSO provider HTTP requests.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewHTTPHandler creates a new SSO HTTP handler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger}
}

// Router registers SSO routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Get("/", h.listProviders)
	r.Post("/", h.createProvider)
	r.Get("/{id}", h.getProvider)
	r.Put("/{id}", h.updateProvider)
	r.Delete("/{id}", h.deleteProvider)
	r.Post("/{id}/toggle", h.toggleProvider)

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

	var providerType *ProviderType
	if t := r.URL.Query().Get("type"); t != "" {
		pt := ProviderType(t)
		providerType = &pt
	}

	providers, err := h.svc.ListProviders(r.Context(), tenantID, providerType)
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

	var p Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	id, err := h.svc.CreateProvider(r.Context(), tenantID, p)
	if err != nil {
		h.logger.Error("Failed to create provider", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.JSON(w, r, http.StatusCreated, map[string]string{"id": id})
}

func (h *HTTPHandler) getProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	p, err := h.svc.GetProvider(r.Context(), tenantID, id)
	if err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "provider not found"})
		return
	}

	response.Ok(w, r, p)
}

func (h *HTTPHandler) updateProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var p Provider
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	p.ID = chi.URLParam(r, "id")

	if err := h.svc.UpdateProvider(r.Context(), tenantID, p); err != nil {
		h.logger.Error("Failed to update provider", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]string{"message": "updated"})
}

func (h *HTTPHandler) deleteProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteProvider(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete provider", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.NoContent(w)
}

func (h *HTTPHandler) toggleProvider(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.ToggleProvider(r.Context(), tenantID, id, req.Enabled); err != nil {
		h.logger.Error("Failed to toggle provider", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.JSON(w, r, http.StatusOK, map[string]bool{"enabled": req.Enabled})
}
