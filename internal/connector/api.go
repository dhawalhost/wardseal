package connector

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler handles connector HTTP requests.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewHTTPHandler creates a new connector HTTP handler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger}
}

// Router registers connector routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Get("/", h.listConnectors)
	r.Post("/", h.createConnector)
	r.Get("/{id}", h.getConnector)
	r.Put("/{id}", h.updateConnector)
	r.Delete("/{id}", h.deleteConnector)
	r.Post("/{id}/toggle", h.toggleConnector)
	r.Post("/test", h.testConnection)

	return r
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) listConnectors(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	connectors, err := h.svc.ListConnectors(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list connectors", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]interface{}{"connectors": connectors})
}

func (h *HTTPHandler) createConnector(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	id, err := h.svc.CreateConnector(r.Context(), tenantID, config)
	if err != nil {
		h.logger.Error("Failed to create connector", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.JSON(w, r, http.StatusCreated, map[string]string{"id": id})
}

func (h *HTTPHandler) getConnector(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	config, err := h.svc.GetConnector(r.Context(), tenantID, id)
	if err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "connector not found"})
		return
	}

	response.Ok(w, r, config)
}

func (h *HTTPHandler) updateConnector(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	config.ID = chi.URLParam(r, "id")

	if err := h.svc.UpdateConnector(r.Context(), tenantID, config); err != nil {
		h.logger.Error("Failed to update connector", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]string{"message": "updated"})
}

func (h *HTTPHandler) deleteConnector(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteConnector(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete connector", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.NoContent(w)
}

func (h *HTTPHandler) toggleConnector(w http.ResponseWriter, r *http.Request) {
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
	if err := h.svc.ToggleConnector(r.Context(), tenantID, id, req.Enabled); err != nil {
		h.logger.Error("Failed to toggle connector", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]bool{"enabled": req.Enabled})
}

func (h *HTTPHandler) testConnection(w http.ResponseWriter, r *http.Request) {
	// For testing, tenant ID isn't strictly necessary but good practice
	_, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.svc.TestConnection(r.Context(), config); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]interface{}{"error": err.Error(), "status": "failed"})
		return
	}

	response.Ok(w, r, map[string]string{"status": "success"})
}
