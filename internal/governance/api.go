package governance

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/internal/oauthclient"
	"github.com/dhawalhost/wardseal/internal/webhook"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler represents the HTTP API handlers for the governance service.
type HTTPHandler struct {
	svc             Service
	campaignHandler *CampaignHTTPHandler
	webhookHandler  *WebhookHTTPHandler
	orgHandler      *OrganizationHandler
	logger          *zap.Logger
}

// NewHTTPHandler creates a new HTTPHandler.
func NewHTTPHandler(svc Service, campaignSvc CampaignService, webhookSvc webhook.Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{
		svc:             svc,
		campaignHandler: NewCampaignHTTPHandler(campaignSvc, logger),
		webhookHandler:  NewWebhookHTTPHandler(webhookSvc, logger),
		orgHandler:      NewOrganizationHandler(svc, logger),
		logger:          logger,
	}
}

func (h *HTTPHandler) Pattern() string {
	return "/api/v1"
}

// Register registers the governance routes on the provided router.
func (h *HTTPHandler) Register(r chi.Router) {
	r.Get("/health", h.healthCheck)

	r.Group(func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			SlugResolver: h.svc.ResolveTenantSlug,
		}))

		r.Route("/oauth/clients", func(r chi.Router) {
			r.Get("/", h.listOAuthClients)
			r.Post("/", h.createOAuthClient)
			r.Get("/{clientID}", h.getOAuthClient)
			r.Put("/{clientID}", h.updateOAuthClient)
			r.Delete("/{clientID}", h.deleteOAuthClient)
		})

		r.Route("/requests", func(r chi.Router) {
			r.Post("/", h.createAccessRequest)
			r.Get("/", h.listAccessRequests)
			r.Post("/{accessRequestID}/approve", h.approveAccessRequest)
			r.Post("/{accessRequestID}/reject", h.rejectAccessRequest)
		})

		r.Route("/ip-policies", func(r chi.Router) {
			r.Get("/", h.listIPPolicies)
			r.Post("/", h.createIPPolicy)
			r.Delete("/{ipPolicyID}", h.deleteIPPolicy)
		})

		// Mount sub-routers
		r.Mount("/organizations", h.orgHandler.Router())
		r.Mount("/campaigns", h.campaignHandler.Router())
		r.Mount("/webhooks", h.webhookHandler.Router())
	})
}

// Router registers the governance routes and returns a new router.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()
	h.Register(r)
	return r
}

func (h *HTTPHandler) healthCheck(w http.ResponseWriter, r *http.Request) {
	ok, err := h.svc.HealthCheck(r.Context())
	if err != nil {
		h.logger.Error("Health check failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, HealthCheckResponse{Healthy: ok})
}

func (h *HTTPHandler) listOAuthClients(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	clients, err := h.svc.ListOAuthClients(r.Context(), tenantID)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	responses := make([]OAuthClientResponse, 0, len(clients))
	for _, client := range clients {
		responses = append(responses, newOAuthClientResponse(client))
	}
	response.Ok(w, r, map[string]interface{}{"clients": responses})
}

func (h *HTTPHandler) getOAuthClient(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	clientID := chi.URLParam(r, "clientID")
	client, err := h.svc.GetOAuthClient(r.Context(), tenantID, clientID)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, newOAuthClientResponse(client))
}

func (h *HTTPHandler) createOAuthClient(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	var req createOAuthClientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode create oauth client request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	client, err := h.svc.CreateOAuthClient(r.Context(), tenantID, CreateOAuthClientInput(req))
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Created(w, r, newOAuthClientResponse(client))
}

func (h *HTTPHandler) updateOAuthClient(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	clientID := chi.URLParam(r, "clientID")
	var req updateOAuthClientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode update oauth client request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	client, err := h.svc.UpdateOAuthClient(r.Context(), tenantID, clientID, UpdateOAuthClientInput(req))
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, newOAuthClientResponse(client))
}

func (h *HTTPHandler) deleteOAuthClient(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	clientID := chi.URLParam(r, "clientID")
	if err := h.svc.DeleteOAuthClient(r.Context(), tenantID, clientID); err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) createAccessRequest(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	var req CreateAccessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode create access request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if req.RequesterID == "" {
		req.RequesterID = h.actorIDFromRequest(r)
	}
	resp, err := h.svc.CreateAccessRequest(r.Context(), tenantID, req)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Created(w, r, resp)
}

func (h *HTTPHandler) listAccessRequests(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	status := r.URL.Query().Get("status")
	requests, err := h.svc.ListAccessRequests(r.Context(), tenantID, status)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, AccessRequestList{Requests: requests})
}

func (h *HTTPHandler) approveAccessRequest(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	requestID := chi.URLParam(r, "accessRequestID")
	var body ApprovalDecision
	_ = json.NewDecoder(r.Body).Decode(&body)
	approverID := h.actorIDFromRequest(r)
	if approverID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "approver user id required"})
		return
	}

	if err := h.svc.ApproveAccessRequest(r.Context(), tenantID, requestID, approverID, body.Comment); err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, map[string]string{"status": "approved"})
}

func (h *HTTPHandler) rejectAccessRequest(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	requestID := chi.URLParam(r, "accessRequestID")
	var body ApprovalDecision
	_ = json.NewDecoder(r.Body).Decode(&body)
	approverID := h.actorIDFromRequest(r)
	if approverID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "approver user id required"})
		return
	}

	if err := h.svc.RejectAccessRequest(r.Context(), tenantID, requestID, approverID, body.Comment); err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, map[string]string{"status": "rejected"})
}

func (h *HTTPHandler) listIPPolicies(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	policies, err := h.svc.ListIPPolicies(r.Context(), tenantID)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Ok(w, r, map[string]interface{}{"policies": policies})
}

func (h *HTTPHandler) createIPPolicy(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	var req CreateIPPolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode create ip policy request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	policy, err := h.svc.CreateIPPolicy(r.Context(), tenantID, req)
	if err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.Created(w, r, policy)
}

func (h *HTTPHandler) deleteIPPolicy(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	id := chi.URLParam(r, "ipPolicyID")
	if err := h.svc.DeleteIPPolicy(r.Context(), tenantID, id); err != nil {
		h.handleServiceError(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		return "", false
	}
	return tenantID, true
}

func (h *HTTPHandler) handleServiceError(w http.ResponseWriter, r *http.Request, err error) {
	if IsValidationError(err) {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if errors.Is(err, oauthclient.ErrNotFound) {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}
	h.logger.Error("governance service error", zap.Error(err))
	response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
}

func (h *HTTPHandler) actorIDFromRequest(r *http.Request) string {
	if userID := r.Header.Get("X-User-ID"); userID != "" {
		return userID
	}
	return ""
}
