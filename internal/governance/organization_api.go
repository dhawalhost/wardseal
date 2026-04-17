package governance

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// OrganizationHandler handles organization API requests.
type OrganizationHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewOrganizationHandler creates a new organization handler.
func NewOrganizationHandler(svc Service, logger *zap.Logger) *OrganizationHandler {
	return &OrganizationHandler{svc: svc, logger: logger}
}

// Router registers organization routes.
func (h *OrganizationHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Get("/", h.listOrganizations)
	r.Post("/", h.createOrganization)
	r.Get("/{id}", h.getOrganization)
	r.Put("/{id}", h.updateOrganization)
	r.Delete("/{id}", h.deleteOrganization)

	// User assignments
	r.Post("/{id}/users", h.addUserToOrganization)
	r.Delete("/{id}/users/{userID}", h.removeUserFromOrganization)
	r.Get("/users/{userID}", h.listUserOrganizations)

	return r
}

// CreateOrganizationRequest is the request to create an organization.
type CreateOrganizationRequest struct {
	Name        string          `json:"name"`
	DisplayName *string         `json:"display_name"`
	Description *string         `json:"description"` // For compatibility with tests
	Domain      *string         `json:"domain"`
	Metadata    json.RawMessage `json:"metadata"`
	Settings    json.RawMessage `json:"settings"`
}

// UpdateOrganizationRequest is the request to update an organization.
type UpdateOrganizationRequest struct {
	Name           *string         `json:"name"`
	DisplayName    *string         `json:"display_name"`
	Domain         *string         `json:"domain"`
	DomainVerified *bool           `json:"domain_verified"`
	Metadata       json.RawMessage `json:"metadata"`
	Settings       json.RawMessage `json:"settings"`
}

func (h *OrganizationHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		return "", false
	}
	return tenantID, true
}

func (h *OrganizationHandler) listOrganizations(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	if limit <= 0 {
		limit = 50
	}

	orgs, err := h.svc.ListOrganizations(r.Context(), tenantID, limit, offset)
	if err != nil {
		h.logger.Error("Failed to list organizations", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list organizations"})
		return
	}

	response.Ok(w, r, map[string]interface{}{"organizations": orgs})
}

func (h *OrganizationHandler) createOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var req CreateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Check if org with same name exists
	existing, _ := h.svc.GetOrganizationByName(r.Context(), tenantID, req.Name)
	if existing != nil {
		response.JSON(w, r, http.StatusConflict, map[string]string{"error": "organization with this name already exists"})
		return
	}

	displayName := req.DisplayName
	if displayName == nil {
		displayName = req.Description
	}

	org := &Organization{
		TenantID:    tenantID,
		Name:        req.Name,
		DisplayName: displayName,
		Domain:      req.Domain,
		Metadata:    req.Metadata,
		Settings:    req.Settings,
	}

	if err := h.svc.CreateOrganization(r.Context(), org); err != nil {
		h.logger.Error("Failed to create organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to create organization"})
		return
	}

	response.Created(w, r, org)
}

func (h *OrganizationHandler) getOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	org, err := h.svc.GetOrganization(r.Context(), tenantID, orgID)
	if err != nil {
		h.logger.Error("Failed to get organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to get organization"})
		return
	}
	if org == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "organization not found"})
		return
	}

	response.Ok(w, r, org)
}

func (h *OrganizationHandler) updateOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	existing, err := h.svc.GetOrganization(r.Context(), tenantID, orgID)
	if err != nil {
		h.logger.Error("Failed to get organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to get organization"})
		return
	}
	if existing == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "organization not found"})
		return
	}

	var req UpdateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Apply updates
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.DisplayName != nil {
		existing.DisplayName = req.DisplayName
	}
	if req.Domain != nil {
		existing.Domain = req.Domain
	}
	if req.DomainVerified != nil {
		existing.DomainVerified = *req.DomainVerified
	}
	if req.Metadata != nil {
		existing.Metadata = req.Metadata
	}
	if req.Settings != nil {
		existing.Settings = req.Settings
	}

	if err := h.svc.UpdateOrganization(r.Context(), existing); err != nil {
		h.logger.Error("Failed to update organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to update organization"})
		return
	}

	response.Ok(w, r, existing)
}

func (h *OrganizationHandler) deleteOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	orgID := chi.URLParam(r, "id")
	if err := h.svc.DeleteOrganization(r.Context(), tenantID, orgID); err != nil {
		h.logger.Error("Failed to delete organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to delete organization"})
		return
	}

	response.NoContent(w)
}

func (h *OrganizationHandler) addUserToOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	orgID := chi.URLParam(r, "id")
	var req struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.svc.AddUserToOrganization(r.Context(), tenantID, req.UserID, orgID, req.Role); err != nil {
		h.logger.Error("Failed to add user to organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to add user to organization"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "user added to organization"})
}

func (h *OrganizationHandler) removeUserFromOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	orgID := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userID")

	if err := h.svc.RemoveUserFromOrganization(r.Context(), tenantID, userID, orgID); err != nil {
		h.logger.Error("Failed to remove user from organization", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to remove user from organization"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "user removed from organization"})
}

func (h *OrganizationHandler) listUserOrganizations(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}
	userID := chi.URLParam(r, "userID")

	orgIDs, err := h.svc.ListUserOrganizations(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to list user organizations", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list user organizations"})
		return
	}

	response.Ok(w, r, map[string]interface{}{"organization_ids": orgIDs})
}
