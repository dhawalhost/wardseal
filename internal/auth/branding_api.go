package auth

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

func (h *HTTPHandler) getPublicBranding(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantID")
	if tenantID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant ID required"})
		return
	}

	config, err := h.svc.GetBranding(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to fetch branding", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to fetch branding"})
		return
	}

	response.Ok(w, r, config)
}

func (h *HTTPHandler) getBranding(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	config, err := h.svc.GetBranding(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to fetch branding", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to fetch branding"})
		return
	}

	response.Ok(w, r, config)
}

func (h *HTTPHandler) updateBranding(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	var req BrandingConfig
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	req.TenantID = tenantID

	if err := h.svc.UpdateBranding(r.Context(), req); err != nil {
		h.logger.Error("Failed to update branding", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to update branding"})
		return
	}

	response.Ok(w, r, req)
}
