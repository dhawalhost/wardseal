package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"go.uber.org/zap"
)

func (h *HTTPHandler) socialLogin(w http.ResponseWriter, r *http.Request) {
	var req SocialLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode social login request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Social login request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// For MVP/Simulated flow, we assume the client might send email/external_id directly
	// In production, `Code` would be exchanged.

	resp, err := h.svc.SocialLogin(r.Context(), req)
	if err != nil {
		h.logger.Error("Social login failed", zap.Error(err))
		svcErr := &Error{}
		if errors.As(err, &svcErr) {
			h.respondOAuthError(w, r, svcErr)
		} else {
			response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return
	}

	response.Ok(w, r, resp)
}
