package scim

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/dhawalhost/wardseal/internal/directory"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/dhawalhost/wardseal/pkg/types"
	"go.uber.org/zap"
)

// HTTPHandler handles SCIM HTTP requests.
type HTTPHandler struct {
	svc              *Service
	logger           *zap.Logger
	repo             directory.Repository
	serviceAuthToken types.Secret // internal service token
}

// NewHTTPHandler creates a new SCIM HTTP handler.
func NewHTTPHandler(svc *Service, repo directory.Repository, serviceAuthToken types.Secret, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, repo: repo, serviceAuthToken: serviceAuthToken, logger: logger}
}

// Router returns a chi.Router for SCIM endpoints.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Group(func(r chi.Router) {
		// Apply SCIM specific Bearer token authentication and content type middleware
		r.Use(directory.RequireSCIMBearerToken(h.repo, h.logger, h.serviceAuthToken))
		r.Use(scimContentType)

		r.Route("/Users", func(r chi.Router) {
			r.Get("/", h.listUsers)
			r.Post("/", h.createUser)
			r.Get("/{id}", h.getUser)
			r.Put("/{id}", h.replaceUser)
			r.Patch("/{id}", h.patchUser)
			r.Delete("/{id}", h.deleteUser)
		})

		r.Route("/Groups", func(r chi.Router) {
			r.Get("/", h.listGroups)
			r.Post("/", h.createGroup)
			r.Get("/{id}", h.getGroup)
			r.Put("/{id}", h.replaceGroup)
			r.Patch("/{id}", h.patchGroup)
			r.Delete("/{id}", h.deleteGroup)
		})
	})

	return r
}

func scimContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/scim+json")
		next.ServeHTTP(w, r)
	})
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	q := r.URL.Query()
	filter := q.Get("filter")
	startIndex, _ := strconv.Atoi(q.Get("startIndex"))
	if startIndex <= 0 {
		startIndex = 1
	}
	count, _ := strconv.Atoi(q.Get("count"))
	if count <= 0 {
		count = 100
	}

	resp, err := h.svc.ListUsers(r.Context(), tenantID, filter, startIndex, count)
	if err != nil {
		h.logger.Error("Failed to list SCIM users", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *HTTPHandler) getUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	user, err := h.svc.GetUser(r.Context(), tenantID, id)
	if err != nil {
		h.logger.Error("Failed to get SCIM user", zap.Error(err))
		h.respondError(w, r, http.StatusNotFound, "Resource not found", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *HTTPHandler) createUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	var req User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "scimType invalidSyntax")
		return
	}

	user, err := h.svc.CreateUser(r.Context(), tenantID, req)
	if err != nil {
		h.logger.Error("Failed to create SCIM user", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *HTTPHandler) replaceUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	var req User
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "invalidSyntax")
		return
	}

	user, err := h.svc.ReplaceUser(r.Context(), tenantID, id, req)
	if err != nil {
		h.logger.Error("Failed to replace SCIM user", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *HTTPHandler) patchUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	var req PatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "invalidSyntax")
		return
	}

	user, err := h.svc.PatchUser(r.Context(), tenantID, id, req.Operations)
	if err != nil {
		h.logger.Error("Failed to patch SCIM user", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *HTTPHandler) deleteUser(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteUser(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete SCIM user", zap.Error(err))
		h.respondError(w, r, http.StatusNotFound, "Resource not found", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *HTTPHandler) listGroups(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	q := r.URL.Query()
	startIndex, _ := strconv.Atoi(q.Get("startIndex"))
	if startIndex <= 0 {
		startIndex = 1
	}
	count, _ := strconv.Atoi(q.Get("count"))
	if count <= 0 {
		count = 100
	}

	resp, err := h.svc.ListGroups(r.Context(), tenantID, startIndex, count)
	if err != nil {
		h.logger.Error("Failed to list SCIM groups", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *HTTPHandler) getGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	group, err := h.svc.GetGroup(r.Context(), tenantID, id)
	if err != nil {
		h.logger.Error("Failed to get SCIM group", zap.Error(err))
		h.respondError(w, r, http.StatusNotFound, "Resource not found", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(group)
}

func (h *HTTPHandler) createGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	var req Group
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "invalidSyntax")
		return
	}

	group, err := h.svc.CreateGroup(r.Context(), tenantID, req)
	if err != nil {
		h.logger.Error("Failed to create SCIM group", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(group)
}

func (h *HTTPHandler) replaceGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	var req Group
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "invalidSyntax")
		return
	}

	group, err := h.svc.ReplaceGroup(r.Context(), tenantID, id, req)
	if err != nil {
		h.logger.Error("Failed to replace SCIM group", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(group)
}

func (h *HTTPHandler) patchGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	var req PatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, r, http.StatusBadRequest, "Invalid syntax", "invalidSyntax")
		return
	}

	group, err := h.svc.PatchGroup(r.Context(), tenantID, id, req.Operations)
	if err != nil {
		h.logger.Error("Failed to patch SCIM group", zap.Error(err))
		h.respondError(w, r, http.StatusInternalServerError, "Internal server error", "")
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(group)
}

func (h *HTTPHandler) deleteGroup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		h.respondError(w, r, http.StatusUnauthorized, "invalid tenant", "")
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteGroup(r.Context(), tenantID, id); err != nil {
		h.logger.Error("Failed to delete SCIM group", zap.Error(err))
		h.respondError(w, r, http.StatusNotFound, "Resource not found", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *HTTPHandler) respondError(w http.ResponseWriter, r *http.Request, status int, detail, scimType string) {
	resp := Error{
		Schemas:  []string{ErrorSchema},
		Status:   fmt.Sprintf("%d", status),
		Detail:   detail,
		ScimType: scimType,
	}
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}
