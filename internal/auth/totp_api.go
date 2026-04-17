package auth

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image/png"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/pquerna/otp/totp"
	"go.uber.org/zap"
)

// TOTPEnrollRequest is the request to start TOTP enrollment.
type TOTPEnrollRequest struct {
	UserID string `json:"user_id"`
}

// TOTPEnrollResponse contains the secret and QR code for enrollment.
type TOTPEnrollResponse struct {
	Secret  string `json:"secret"`
	QRCode  string `json:"qr_code"` // Base64 encoded PNG
	OTPAuth string `json:"otpauth_url"`
}

// TOTPVerifyRequest is the request to verify a TOTP code.
type TOTPVerifyRequest struct {
	UserID string `json:"user_id"`
	Code   string `json:"code"`
}

func (h *HTTPHandler) enrollTOTP(w http.ResponseWriter, r *http.Request) {
	var req TOTPEnrollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	// Generate TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "WardSeal",
		AccountName: req.UserID,
	})
	if err != nil {
		h.logger.Error("Failed to generate TOTP key", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to generate TOTP key"})
		return
	}

	// Generate QR code
	var buf bytes.Buffer
	img, err := key.Image(200, 200)
	if err != nil {
		h.logger.Error("Failed to generate QR image", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to generate QR code"})
		return
	}
	if err := png.Encode(&buf, img); err != nil {
		h.logger.Error("Failed to encode QR image", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to encode QR code"})
		return
	}
	qrBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())

	// Store the secret (unverified)
	secret := &TOTPSecret{
		IdentityID: req.UserID,
		TenantID:   tenantID,
		Secret:     key.Secret(),
	}
	if err := h.svc.TOTP().Create(r.Context(), secret); err != nil {
		h.logger.Error("Failed to store TOTP secret", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to store TOTP secret"})
		return
	}

	response.JSON(w, r, http.StatusOK, TOTPEnrollResponse{
		Secret:  key.Secret(),
		QRCode:  qrBase64,
		OTPAuth: key.URL(),
	})
}

func (h *HTTPHandler) verifyTOTP(w http.ResponseWriter, r *http.Request) {
	var req TOTPVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	// Get stored secret
	stored, err := h.svc.TOTP().GetByIdentity(r.Context(), tenantID, req.UserID)
	if err != nil {
		h.logger.Error("Failed to get TOTP secret", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve TOTP secret"})
		return
	}
	if stored == nil {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "TOTP not enrolled for this user"})
		return
	}

	// Validate code
	valid := totp.Validate(req.Code, stored.Secret)
	if !valid {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "invalid TOTP code"})
		return
	}

	// Mark as verified if not already
	if !stored.Verified {
		if err := h.svc.TOTP().MarkVerified(r.Context(), stored.ID); err != nil {
			h.logger.Error("Failed to mark TOTP verified", zap.Error(err))
			response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to verify TOTP"})
			return
		}
	}

	response.JSON(w, r, http.StatusOK, map[string]bool{"verified": true})
}

func (h *HTTPHandler) deleteTOTP(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id query parameter required"})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	if err := h.svc.TOTP().Delete(r.Context(), tenantID, userID); err != nil {
		h.logger.Error("Failed to delete TOTP", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to delete TOTP"})
		return
	}

	response.JSON(w, r, http.StatusOK, map[string]string{"message": "TOTP deleted"})
}

func (h *HTTPHandler) getTOTPStatus(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id query parameter required"})
		return
	}

	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant required"})
		return
	}

	stored, err := h.svc.TOTP().GetByIdentity(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to get TOTP status", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to get TOTP status"})
		return
	}

	if stored == nil {
		response.JSON(w, r, http.StatusOK, map[string]bool{"enrolled": false, "verified": false})
		return
	}

	response.JSON(w, r, http.StatusOK, map[string]interface{}{
		"enrolled":   true,
		"verified":   stored.Verified,
		"created_at": stored.CreatedAt,
	})
}
