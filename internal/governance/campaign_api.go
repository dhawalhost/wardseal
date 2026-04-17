package governance

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// CampaignHTTPHandler handles campaign HTTP requests.
type CampaignHTTPHandler struct {
	svc    CampaignService
	logger *zap.Logger
}

// NewCampaignHTTPHandler creates a new campaign HTTP handler.
func NewCampaignHTTPHandler(svc CampaignService, logger *zap.Logger) *CampaignHTTPHandler {
	return &CampaignHTTPHandler{svc: svc, logger: logger}
}

// Router registers campaign routes.
func (h *CampaignHTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Post("/", h.createCampaign)
	r.Get("/", h.listCampaigns)
	r.Get("/{id}", h.getCampaign)
	r.Post("/{id}/start", h.startCampaign)
	r.Post("/{id}/complete", h.completeCampaign)
	r.Post("/{id}/cancel", h.cancelCampaign)
	r.Delete("/{id}", h.deleteCampaign)

	// Review items
	r.Route("/{id}/items", func(r chi.Router) {
		r.Post("/", h.addReviewItem)
		r.Get("/", h.listPendingItems)
		r.Post("/{itemId}/approve", h.approveItem)
		r.Post("/{itemId}/revoke", h.revokeItem)
	})
	r.Get("/items", h.listReviewItems)

	return r
}

func (h *CampaignHTTPHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		// Response might be handled by middleware or caller
		return "", false
	}
	return tenantID, true
}

func (h *CampaignHTTPHandler) createCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var input CreateCampaignInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	campaign, err := h.svc.CreateCampaign(r.Context(), tenantID, input)
	if err != nil {
		h.logger.Error("Failed to create campaign", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, campaign)
}

func (h *CampaignHTTPHandler) listCampaigns(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	status := r.URL.Query().Get("status")
	campaigns, err := h.svc.ListCampaigns(r.Context(), tenantID, status)
	if err != nil {
		h.logger.Error("Failed to list campaigns", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"campaigns": campaigns})
}

func (h *CampaignHTTPHandler) getCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	campaign, err := h.svc.GetCampaign(r.Context(), tenantID, id)
	if err != nil {
		h.logger.Error("Failed to get campaign", zap.Error(err))
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "campaign not found"})
		return
	}
	response.Ok(w, r, campaign)
}

func (h *CampaignHTTPHandler) startCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.StartCampaign(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to start campaign", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"status": "active"})
}

func (h *CampaignHTTPHandler) completeCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.CompleteCampaign(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to complete campaign", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"status": "completed"})
}

func (h *CampaignHTTPHandler) cancelCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.CancelCampaign(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to cancel campaign", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"status": "cancelled"})
}

func (h *CampaignHTTPHandler) deleteCampaign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteCampaign(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete campaign", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *CampaignHTTPHandler) addReviewItem(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	campaignID := chi.URLParam(r, "id")
	var item CertificationItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.svc.AddReviewItem(r.Context(), tenantID, campaignID, item)
	if err != nil {
		h.logger.Error("Failed to add review item", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, result)
}

func (h *CampaignHTTPHandler) listPendingItems(w http.ResponseWriter, r *http.Request) {
	campaignID := chi.URLParam(r, "id")
	items, err := h.svc.ListPendingItems(r.Context(), campaignID)
	if err != nil {
		h.logger.Error("Failed to list pending items", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"items": items})
}

func (h *CampaignHTTPHandler) listReviewItems(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	reviewerID := r.URL.Query().Get("reviewer_id")
	if reviewerID == "" {
		reviewerID = campaignActorIDFromRequest(r)
	}
	if reviewerID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "reviewer_id is required"})
		return
	}

	items, err := h.svc.ListReviewItems(r.Context(), tenantID, reviewerID)
	if err != nil {
		h.logger.Error("Failed to list review items", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"items": items})
}

func (h *CampaignHTTPHandler) approveItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	var body struct {
		Comment string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.svc.ApproveItem(r.Context(), itemID, body.Comment); err != nil {
		h.logger.Error("Failed to approve item", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"decision": "approve"})
}

func (h *CampaignHTTPHandler) revokeItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	var body struct {
		Comment string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.svc.RevokeItem(r.Context(), itemID, body.Comment); err != nil {
		h.logger.Error("Failed to revoke item", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"decision": "revoke"})
}

func campaignActorIDFromRequest(r *http.Request) string {
	// Mock implementation for now, should use middleware context in real scenario
	if userID := r.Header.Get("X-User-ID"); userID != "" {
		return userID
	}
	return ""
}
