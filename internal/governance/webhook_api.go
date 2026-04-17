package governance

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/internal/webhook"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// WebhookHTTPHandler handles webhook management requests.
type WebhookHTTPHandler struct {
	svc    webhook.Service
	logger *zap.Logger
}

func NewWebhookHTTPHandler(svc webhook.Service, logger *zap.Logger) *WebhookHTTPHandler {
	return &WebhookHTTPHandler{svc: svc, logger: logger}
}

// Router registers webhook routes.
func (h *WebhookHTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Post("/", h.createWebhook)
	r.Get("/", h.listWebhooks)
	r.Get("/{id}", h.getWebhook)
	r.Delete("/{id}", h.deleteWebhook)

	return r
}

func (h *WebhookHTTPHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		return "", false
	}
	return tenantID, true
}

func (h *WebhookHTTPHandler) getWebhook(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	hook, err := h.svc.GetWebhook(r.Context(), tenantID, id)
	if err != nil {
		h.logger.Error("Failed to get webhook", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to get webhook"})
		return
	}

	if hook == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "webhook not found"})
		return
	}

	response.Ok(w, r, hook)
}

func (h *WebhookHTTPHandler) createWebhook(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var req struct {
		URL    string   `json:"url"`
		Secret string   `json:"secret"`
		Events []string `json:"events"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	id, err := h.svc.CreateWebhook(r.Context(), tenantID, req.URL, req.Secret, req.Events)
	if err != nil {
		h.logger.Error("Failed to create webhook", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to create webhook"})
		return
	}

	response.Created(w, r, map[string]string{"id": id})
}

func (h *WebhookHTTPHandler) listWebhooks(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	hooks, err := h.svc.ListWebhooks(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list webhooks", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list webhooks"})
		return
	}

	response.Ok(w, r, map[string]interface{}{"webhooks": hooks})
}

func (h *WebhookHTTPHandler) deleteWebhook(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteWebhook(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete webhook", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to delete webhook"})
		return
	}

	response.NoContent(w)
}
