package directory

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"database/sql"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/dhawalhost/wardseal/pkg/types"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// HTTPHandler represents the HTTP API handlers for the directory service.
type HTTPHandler struct {
	svc         Service
	logger      *zap.Logger
	validate    *validator.Validate
	serviceAuth middleware.ServiceAuthConfig
}

// NewHTTPHandler creates a new HTTPHandler.
func NewHTTPHandler(svc Service, logger *zap.Logger, cfg HTTPHandlerConfig) *HTTPHandler {
	serviceAuth := middleware.ServiceAuthConfig{
		HeaderName: cfg.ServiceAuthHeader,
		Token:      cfg.ServiceAuthToken,
	}
	return &HTTPHandler{svc: svc, logger: logger, validate: validator.New(), serviceAuth: serviceAuth}
}

// HTTPHandlerConfig controls optional behavior for the HTTP handler.
type HTTPHandlerConfig struct {
	ServiceAuthToken  types.Secret
	ServiceAuthHeader string
}

func (h *HTTPHandler) Pattern() string {
	return "/"
}

// Router registers the directory routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	// Health check
	r.Get("/health", h.healthCheck)

	r.Group(func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			SlugResolver: h.svc.GetTenantIDBySlug,
		}))

		// User routes
		r.Route("/users", func(r chi.Router) {
			r.Post("/", h.createUser)
			r.Get("/{id}", h.getUserByID)
			r.Get("/", h.listUsers) // Handles both List and GetByEmail
			r.Put("/{id}", h.updateUser)
			r.Delete("/{id}", h.deleteUser)
		})

		// Group routes
		r.Route("/groups", func(r chi.Router) {
			r.Post("/", h.createGroup)
			r.Get("/{id}", h.getGroupByID)
			r.Put("/{id}", h.updateGroup)
			r.Delete("/{id}", h.deleteGroup)

			// Group membership routes
			r.Route("/{id}/users", func(r chi.Router) {
				r.Post("/", h.addUserToGroup)
				r.Delete("/{userID}", h.removeUserFromGroup)
			})
		})

		// User-Organization mappings (within a tenant)
		r.Route("/users/{id}/organizations", func(r chi.Router) {
			r.Post("/{orgID}", h.addUserToOrganization)
			r.Delete("/{orgID}", h.removeUserFromOrganization)
			r.Get("/", h.listUserOrganizations)
		})
	})

	r.Route("/internal", func(r chi.Router) {
		r.Use(middleware.ServiceAuthenticator(h.serviceAuth))

		r.Group(func(r chi.Router) {
			r.Use(middleware.TenantExtractor(middleware.TenantConfig{
				SlugResolver: h.svc.GetTenantIDBySlug,
			}))
			r.Post("/credentials/verify", h.verifyCredentials)
		})

		// Global internal routes (no tenant context required)
		r.Get("/discover", h.discoverTenant)
		r.Get("/tenants/resolve", h.resolveTenantSlug)
	})

	// Tenant Management
	r.Post("/tenants", h.createTenant)

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

// User handlers
func (h *HTTPHandler) createUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode create user request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Create user request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	userID, err := h.svc.CreateUser(r.Context(), tenantID, req.User)
	if err != nil {
		h.logger.Error("Create user failed", zap.Error(err))
		if errors.Is(err, ErrEmailAlreadyExistsGlobally) {
			response.JSON(w, r, http.StatusConflict, map[string]string{"error": err.Error()})
			return
		}
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, CreateUserResponse{UserID: userID})
}

func (h *HTTPHandler) getUserByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	req := GetUserByIDRequest{ID: id}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Get user by ID request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	user, err := h.svc.GetUserByID(r.Context(), tenantID, req.ID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, sql.ErrNoRows) {
			response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
		h.logger.Error("Get user by ID failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, GetUserByIDResponse{User: user})
}

func (h *HTTPHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}

	q := r.URL.Query()
	email := q.Get("email")
	if email != "" {
		req := GetUserByEmailRequest{Email: email}
		if err := h.validate.Struct(req); err != nil {
			h.logger.Error("Get user by email request validation failed", zap.Error(err))
			response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		user, err := h.svc.GetUserByEmail(r.Context(), tenantID, req.Email)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, sql.ErrNoRows) {
				response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "user not found"})
				return
			}
			h.logger.Error("Get user by email failed", zap.Error(err))
			response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		response.Ok(w, r, GetUserByEmailResponse{User: user})
		return
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}

	users, total, err := h.svc.ListUsers(r.Context(), tenantID, limit, offset)
	if err != nil {
		h.logger.Error("List users failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, ListUsersResponse{Users: users, Total: total})
}

func (h *HTTPHandler) updateUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		h.logger.Error("Failed to decode update user request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	req := UpdateUserRequest{ID: id, User: user}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Update user request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.svc.UpdateUser(r.Context(), tenantID, id, req.User)
	if err != nil {
		h.logger.Error("Update user failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) deleteUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	req := DeleteUserRequest{ID: id}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Delete user request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.svc.DeleteUser(r.Context(), tenantID, req.ID)
	if err != nil {
		h.logger.Error("Delete user failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

// Group handlers
func (h *HTTPHandler) createGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode create group request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Create group request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	groupID, err := h.svc.CreateGroup(r.Context(), tenantID, req.Group)
	if err != nil {
		h.logger.Error("Create group failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, CreateGroupResponse{GroupID: groupID})
}

func (h *HTTPHandler) getGroupByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	req := GetGroupByIDRequest{ID: id}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Get group by ID request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	group, err := h.svc.GetGroupByID(r.Context(), tenantID, req.ID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, sql.ErrNoRows) {
			response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "group not found"})
			return
		}
		h.logger.Error("Get group by ID failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, GetGroupByIDResponse{Group: group})
}

func (h *HTTPHandler) updateGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	var group Group
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		h.logger.Error("Failed to decode update group request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	req := UpdateGroupRequest{ID: id, Group: group}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Update group request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.svc.UpdateGroup(r.Context(), tenantID, id, req.Group)
	if err != nil {
		h.logger.Error("Update group failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) deleteGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	req := DeleteGroupRequest{ID: id}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Delete group request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.svc.DeleteGroup(r.Context(), tenantID, req.ID)
	if err != nil {
		h.logger.Error("Delete group failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

// Group membership handlers
func (h *HTTPHandler) addUserToGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	groupID := chi.URLParam(r, "id")
	var req AddUserToGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode add user to group request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	req.GroupID = groupID
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Add user to group request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err := h.svc.AddUserToGroup(r.Context(), tenantID, req.UserID, groupID)
	if err != nil {
		h.logger.Error("Add user to group failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) removeUserFromGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	groupID := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userID")
	req := RemoveUserFromGroupRequest{GroupID: groupID, UserID: userID}
	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Remove user from group request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	err := h.svc.RemoveUserFromGroup(r.Context(), tenantID, req.UserID, req.GroupID)
	if err != nil {
		h.logger.Error("Remove user from group failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) verifyCredentials(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		return
	}
	var req VerifyCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode verify credentials request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Verify credentials request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	user, err := h.svc.VerifyCredentials(r.Context(), tenantID, req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": ErrInvalidCredentials.Error()})
			return
		}
		h.logger.Error("Verify credentials failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, VerifyCredentialsResponse{User: user})
}

func (h *HTTPHandler) discoverTenant(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "email required"})
		return
	}

	tenantID, err := h.svc.GetTenantByEmail(r.Context(), email)
	if err != nil {
		h.logger.Error("Discover tenant failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if tenantID == "" {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "tenant not found"})
		return
	}

	response.Ok(w, r, map[string]string{"tenant_id": tenantID})
}

func (h *HTTPHandler) createTenant(w http.ResponseWriter, r *http.Request) {
	var req CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	plan := req.Plan
	if plan == "" {
		plan = "default"
	}

	if err := h.svc.CreateTenant(r.Context(), req.ID, req.Name, req.Slug, plan); err != nil {
		if errors.Is(err, ErrAlreadyExists) {
			response.JSON(w, r, http.StatusConflict, map[string]string{"error": "tenant already exists"})
			return
		}
		h.logger.Error("Failed to create tenant", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to create tenant"})
		return
	}

	response.Created(w, r, map[string]string{"message": "tenant created successfully"})
}

func (h *HTTPHandler) resolveTenantSlug(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "slug is required"})
		return
	}
	tenantID, err := h.svc.GetTenantIDBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Error("Failed to resolve tenant slug", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to resolve tenant slug"})
		return
	}
	if tenantID == "" {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "tenant not found"})
		return
	}
	response.Ok(w, r, map[string]string{"tenant_id": tenantID})
}

func (h *HTTPHandler) addUserToOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := h.tenantID(r)
	userID := chi.URLParam(r, "id")
	orgID := chi.URLParam(r, "orgID")
	var req struct {
		Role string `json:"role"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.svc.AddUserToOrganization(r.Context(), tenantID, userID, orgID, req.Role); err != nil {
		h.logger.Error("Add user to organization failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to add user to organization"})
		return
	}
	response.Ok(w, r, map[string]string{"message": "user added to organization"})
}

func (h *HTTPHandler) removeUserFromOrganization(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := h.tenantID(r)
	userID := chi.URLParam(r, "id")
	orgID := chi.URLParam(r, "orgID")

	if err := h.svc.RemoveUserFromOrganization(r.Context(), tenantID, userID, orgID); err != nil {
		h.logger.Error("Remove user from organization failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to remove user from organization"})
		return
	}
	response.Ok(w, r, map[string]string{"message": "user removed from organization"})
}

func (h *HTTPHandler) listUserOrganizations(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := h.tenantID(r)
	userID := chi.URLParam(r, "id")

	orgIDs, err := h.svc.ListUserOrganizations(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("List user organizations failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list user organizations"})
		return
	}
	response.Ok(w, r, map[string]string{"organization_ids": strings.Join(orgIDs, ",")}) // Simplified for now
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		// Note: Response might have nil ResponseWriter if called from places where it shouldn't
		return "", false
	}
	return tenantID, true
}

type CreateTenantRequest struct {
	ID   string `json:"id" validate:"required"`
	Name string `json:"name" validate:"required"`
	Slug string `json:"slug" validate:"required"`
	Plan string `json:"plan"`
}
