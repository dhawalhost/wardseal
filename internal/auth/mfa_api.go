package auth

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"go.uber.org/zap"
)

func (h *HTTPHandler) beginWebAuthnRegistration(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id required"})
		return
	}

	options, session, err := h.svc.BeginWebAuthnRegistration(r.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to begin registration", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Store session
	h.webAuthnSessions.Set(userID, *session)

	response.JSON(w, r, http.StatusOK, options)
}

func (h *HTTPHandler) finishWebAuthnRegistration(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id required"})
		return
	}

	session, ok := h.webAuthnSessions.Get(userID)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "session not found"})
		return
	}

	err := h.svc.FinishWebAuthnRegistration(r.Context(), userID, session, r)
	if err != nil {
		h.logger.Error("Failed to finish registration", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	h.webAuthnSessions.Delete(userID)
	response.JSON(w, r, http.StatusOK, map[string]string{"message": "Registration successful"})
}

func (h *HTTPHandler) beginWebAuthnLogin(w http.ResponseWriter, r *http.Request) {
	type BeginLoginRequest struct {
		UserID string `json:"user_id"`
	}
	var req BeginLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if req.UserID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id required"})
		return
	}

	options, session, err := h.svc.BeginWebAuthnLogin(r.Context(), req.UserID)
	if err != nil {
		h.logger.Error("Failed to begin login", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.webAuthnSessions.Set(req.UserID, *session)
	response.JSON(w, r, http.StatusOK, options)
}

func (h *HTTPHandler) finishWebAuthnLogin(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "user_id query param required"})
		return
	}

	session, ok := h.webAuthnSessions.Get(userID)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "session not found"})
		return
	}

	token, err := h.svc.FinishWebAuthnLogin(r.Context(), userID, session, r)
	if err != nil {
		h.logger.Error("Failed to finish login", zap.Error(err))
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	h.webAuthnSessions.Delete(userID)
	response.JSON(w, r, http.StatusOK, map[string]string{"access_token": token, "token_type": "Bearer"})
}
