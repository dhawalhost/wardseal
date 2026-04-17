package rbac

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler handles RBAC HTTP requests.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewHTTPHandler creates a new RBAC HTTP handler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger}
}

// Register adds RBAC routes to the provided router.
func (h *HTTPHandler) Register(r chi.Router) {
	// Roles
	r.Route("/roles", func(r chi.Router) {
		r.Post("/", h.createRole)
		r.Get("/", h.listRoles)
		r.Get("/{id}", h.getRole)
		r.Put("/{id}", h.updateRole)
		r.Delete("/{id}", h.deleteRole)
		r.Get("/{id}/permissions", h.getRolePermissions)
		r.Post("/{id}/permissions/{permId}", h.assignPermissionToRole)
		r.Delete("/{id}/permissions/{permId}", h.removePermissionFromRole)
	})

	// Permissions
	r.Route("/permissions", func(r chi.Router) {
		r.Post("/", h.createPermission)
		r.Get("/", h.listPermissions)
	})

	// User roles
	r.Route("/users", func(r chi.Router) {
		r.Get("/{userId}/roles", h.getUserRoles)
		r.Post("/{userId}/roles/{roleId}", h.assignRoleToUser)
		r.Delete("/{userId}/roles/{roleId}", h.removeRoleFromUser)
		r.Get("/{userId}/permissions", h.getUserPermissions)
	})
}

// Router registers RBAC routes and returns a new router.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()
	h.Register(r)
	return r
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) createRole(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	role, err := h.svc.CreateRole(r.Context(), tenantID, body.Name, body.Description)
	if err != nil {
		h.logger.Error("Failed to create role", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, role)
}

func (h *HTTPHandler) listRoles(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	roles, err := h.svc.ListRoles(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list roles", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"roles": roles})
}

func (h *HTTPHandler) getRole(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	role, err := h.svc.GetRole(r.Context(), tenantID, id)
	if err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "role not found"})
		return
	}
	response.Ok(w, r, role)
}

func (h *HTTPHandler) updateRole(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	role, err := h.svc.UpdateRole(r.Context(), tenantID, id, body.Name, body.Description)
	if err != nil {
		h.logger.Error("Failed to update role", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, role)
}

func (h *HTTPHandler) deleteRole(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteRole(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete role", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) getRolePermissions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	perms, err := h.svc.GetRolePermissions(r.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get role permissions", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"permissions": perms})
}

func (h *HTTPHandler) assignPermissionToRole(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")
	permID := chi.URLParam(r, "permId")

	if err := h.svc.AssignPermissionToRole(r.Context(), roleID, permID); err != nil {
		h.logger.Error("Failed to assign permission", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"status": "assigned"})
}

func (h *HTTPHandler) removePermissionFromRole(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "id")
	permID := chi.URLParam(r, "permId")

	if err := h.svc.RemovePermissionFromRole(r.Context(), roleID, permID); err != nil {
		h.logger.Error("Failed to remove permission", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) createPermission(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var body struct {
		Resource    string `json:"resource"`
		Action      string `json:"action"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	perm, err := h.svc.CreatePermission(r.Context(), tenantID, body.Resource, body.Action, body.Description)
	if err != nil {
		h.logger.Error("Failed to create permission", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Created(w, r, perm)
}

func (h *HTTPHandler) listPermissions(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	perms, err := h.svc.ListPermissions(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list permissions", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"permissions": perms})
}

func (h *HTTPHandler) getUserRoles(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	userID := chi.URLParam(r, "userId")
	roles, err := h.svc.GetUserRoles(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to get user roles", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"roles": roles})
}

func (h *HTTPHandler) assignRoleToUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	userID := chi.URLParam(r, "userId")
	roleID := chi.URLParam(r, "roleId")

	if err := h.svc.AssignRoleToUser(r.Context(), tenantID, userID, roleID, nil); err != nil {
		h.logger.Error("Failed to assign role", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]string{"status": "assigned"})
}

func (h *HTTPHandler) removeRoleFromUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	roleID := chi.URLParam(r, "roleId")

	if err := h.svc.RemoveRoleFromUser(r.Context(), userID, roleID); err != nil {
		h.logger.Error("Failed to remove role", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.NoContent(w)
}

func (h *HTTPHandler) getUserPermissions(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	userID := chi.URLParam(r, "userId")
	perms, err := h.svc.GetUserPermissions(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to get user permissions", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, map[string]interface{}{"permissions": perms})
}
