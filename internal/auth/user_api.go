package auth

import (
	"encoding/json"
	"net/http"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"go.uber.org/zap"
)

type UserAppResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	LaunchURL   string `json:"launch_url"` // Computed launch URL (e.g. OIDC init)
	IconURL     string `json:"icon_url"`   // Placeholder for now
}

// getUserApps returns the list of applications available to the current user (tenant).
func (h *HTTPHandler) getUserApps(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant context required"})
		return
	}

	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "user context required"})
		return
	}

	// Fetch apps assigned to this specific user
	apps, err := h.appStore.ListAssignedApps(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("Failed to list assigned apps for user portal",
			zap.String("tenant_id", tenantID),
			zap.String("user_id", userID),
			zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to list applications"})
		return
	}

	appsResp := make([]UserAppResponse, 0, len(apps))
	for _, app := range apps {
		launchURL := ""
		var redirectURIs []string
		if err := json.Unmarshal(app.RedirectURIs, &redirectURIs); err == nil && len(redirectURIs) > 0 {
			launchURL = redirectURIs[0]
		}

		appsResp = append(appsResp, UserAppResponse{
			ID:          app.ID,
			Name:        app.Name,
			Description: stringValue(app.Description),
			LaunchURL:   launchURL,
			IconURL:     stringValue(app.LogoURL),
		})
	}

	response.Ok(w, r, map[string]interface{}{"apps": appsResp})
}

func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// getUserProfile returns the current logged-in user's profile info.
func (h *HTTPHandler) getUserProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "user context required"})
		return
	}

	// For MVP, just return what we have (ID, email often in sub/claims, but better to fetch fresh)
	response.Ok(w, r, map[string]interface{}{
		"id": userID,
	})
}

type UpdateProfileRequest struct {
	Password string `json:"password"`
}

// updateUserProfile allows user to update their own profile (password).
func (h *HTTPHandler) updateUserProfile(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := middleware.TenantIDFromContext(r.Context())
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "tenant context required"})
		return
	}
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "user context required"})
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Password != "" {
		updates["password"] = req.Password
	}

	if len(updates) == 0 {
		response.Ok(w, r, map[string]string{"message": "no changes requested"})
		return
	}

	if err := h.svc.UpdateUserSelf(r.Context(), tenantID, userID, updates); err != nil {
		h.logger.Error("Failed to update user profile", zap.String("user_id", userID), zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to update profile"})
		return
	}

	response.Ok(w, r, map[string]string{"message": "profile updated successfully"})
}
