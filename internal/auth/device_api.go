package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// RegisterDeviceRequest defines the payload for registering a device.
type RegisterDeviceRequest struct {
	DeviceIdentifier string `json:"device_identifier"`
	OS               string `json:"os"`
	OSVersion        string `json:"os_version"`
	IsManaged        bool   `json:"is_managed"`
}

// UpdatePostureRequest defines the payload for updating device posture.
type UpdatePostureRequest struct {
	IsCompliant bool `json:"is_compliant"`
	RiskScore   int  `json:"risk_score"`
}

// registerDevice handles the POST /api/v1/devices/register
func (h *HTTPHandler) registerDevice(w http.ResponseWriter, r *http.Request) {
	var req RegisterDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	userID, _ := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		userID = r.Header.Get("X-User-ID")
	}
	if userID == "" {
		userID = AnonymousUserID // Placeholder for unauthenticated device registration
	}

	device := &Device{
		TenantID:         tenantID,
		UserID:           userID,
		DeviceIdentifier: req.DeviceIdentifier,
		OS:               req.OS,
		OSVersion:        req.OSVersion,
		IsManaged:        req.IsManaged,
		IsCompliant:      true, // Default to compliant on registration
		LastSeenAt:       time.Now(),
	}

	if err := h.svc.Device().Register(r.Context(), device); err != nil {
		h.logger.Error("Failed to register device", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to register device"})
		return
	}

	response.JSON(w, r, http.StatusCreated, device)
}

// updatePosture handles POST /api/v1/devices/{id}/posture
func (h *HTTPHandler) updatePosture(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req UpdatePostureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.svc.Device().UpdatePosture(r.Context(), id, req.IsCompliant, req.RiskScore); err != nil {
		h.logger.Error("Failed to update posture", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to update device posture"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "posture updated"})
}

// listDevices handles GET /api/v1/devices
func (h *HTTPHandler) listDevices(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	devices, err := h.svc.Device().List(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list devices", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list devices"})
		return
	}

	response.Ok(w, r, devices)
}

// deleteDevice handles DELETE /api/v1/devices/{id}
func (h *HTTPHandler) deleteDevice(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.Device().Delete(r.Context(), id); err != nil {
		h.logger.Error("Failed to delete device", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to delete device"})
		return
	}

	response.NoContent(w)
}
