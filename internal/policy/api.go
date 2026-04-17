package policy

import (
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// HTTPHandler represents the HTTP API handlers for the policy service.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
}

// NewHTTPHandler creates a new HTTPHandler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger}
}

// Router returns a chi.Router for policy routes.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.healthCheck)
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
