package audit

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler handles audit log HTTP requests.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewHTTPHandler creates a new audit HTTP handler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger}
}

// Router registers audit routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()

	r.Get("/", h.queryLogs)
	r.Get("/export", h.exportLogs)
	r.Get("/{id}", h.getEvent)

	return r
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) queryLogs(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	params := QueryParams{TenantID: tenantID}

	q := r.URL.Query()
	if v := q.Get("actor_id"); v != "" {
		params.ActorID = &v
	}
	if v := q.Get("action"); v != "" {
		params.Action = &v
	}
	if v := q.Get("resource_type"); v != "" {
		params.ResourceType = &v
	}
	if v := q.Get("resource_id"); v != "" {
		params.ResourceID = &v
	}
	if v := q.Get("outcome"); v != "" {
		params.Outcome = &v
	}
	if v := q.Get("start_time"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.StartTime = &t
		}
	}
	if v := q.Get("end_time"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.EndTime = &t
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Offset = n
		}
	}

	events, total, err := h.svc.Query(r.Context(), params)
	if err != nil {
		h.logger.Error("Failed to query audit logs", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]interface{}{
		"events": events,
		"total":  total,
		"limit":  params.Limit,
		"offset": params.Offset,
	})
}

func (h *HTTPHandler) getEvent(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	id := chi.URLParam(r, "id")
	event, err := h.svc.GetEvent(r.Context(), tenantID, id)
	if err != nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "event not found"})
		return
	}
	response.Ok(w, r, event)
}

func (h *HTTPHandler) exportLogs(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant required"})
		return
	}

	params := QueryParams{TenantID: tenantID}

	q := r.URL.Query()
	if v := q.Get("actor_id"); v != "" {
		params.ActorID = &v
	}
	if v := q.Get("action"); v != "" {
		params.Action = &v
	}
	if v := q.Get("resource_type"); v != "" {
		params.ResourceType = &v
	}
	if v := q.Get("resource_id"); v != "" {
		params.ResourceID = &v
	}
	if v := q.Get("outcome"); v != "" {
		params.Outcome = &v
	}
	if v := q.Get("start_time"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.StartTime = &t
		}
	}
	if v := q.Get("end_time"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.EndTime = &t
		}
	}

	events, err := h.svc.Export(r.Context(), params)
	if err != nil {
		h.logger.Error("Failed to export audit logs", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=audit_logs.csv")

	writer := csv.NewWriter(w)

	// Header
	_ = writer.Write([]string{"Time", "Actor ID", "Actor Type", "Action", "Resource Type", "Resource Name", "Outcome", "IP Address"})

	for _, e := range events {
		_ = writer.Write([]string{
			e.Timestamp.Format(time.RFC3339),
			strVal(e.ActorID),
			e.ActorType,
			e.Action,
			e.ResourceType,
			strVal(e.ResourceName),
			e.Outcome,
			strVal(e.IPAddress),
		})
	}
	writer.Flush()
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
