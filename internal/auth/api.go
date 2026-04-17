package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/dhawalhost/gokit/response"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

// Cookie configuration
const (
	AccessTokenCookie   = "wardseal_access_token"
	RefreshTokenCookie  = "wardseal_refresh_token"
	CookieMaxAge        = 3600          // 1 hour for access token
	RefreshCookieMaxAge = 7 * 24 * 3600 // 7 days for refresh token
)

// setAuthCookies sets httpOnly secure cookies for authentication tokens
func (h *HTTPHandler) setAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	secure := os.Getenv("ENVIRONMENT") == "production"

	// Access token cookie (1 hour)
	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookie,
		Value:    accessToken,
		MaxAge:   CookieMaxAge,
		Path:     "/",
		Secure:   secure,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	// Refresh token cookie (7 days) - if provided
	if refreshToken != "" {
		http.SetCookie(w, &http.Cookie{
			Name:     RefreshTokenCookie,
			Value:    refreshToken,
			MaxAge:   RefreshCookieMaxAge,
			Path:     "/oauth2/token",
			Secure:   secure,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
	}
}

// clearAuthCookies removes authentication cookies
func (h *HTTPHandler) clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookie,
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookie,
		Value:    "",
		MaxAge:   -1,
		Path:     "/oauth2/token",
		HttpOnly: true,
	})
}

// HTTPHandler represents the HTTP API handlers for the auth service.
type HTTPHandler struct {
	svc               Service
	logger            *zap.Logger
	validate          *validator.Validate
	loginAttemptStore LoginAttemptRepository
	appStore          DeveloperAppRepository
	webAuthnSessions  WebAuthnSessionRepository
}

// NewHTTPHandler creates a new HTTPHandler.
func NewHTTPHandler(svc Service, logger *zap.Logger, loginAttemptStore LoginAttemptRepository, appStore DeveloperAppRepository) *HTTPHandler {
	return &HTTPHandler{
		svc:               svc,
		logger:            logger,
		validate:          validator.New(),
		loginAttemptStore: loginAttemptStore,
		appStore:          appStore,
		webAuthnSessions:  newInMemoryWebAuthnSessionRepository(),
	}
}

// SetWebAuthnSessionRepository sets the WebAuthn session repository.
func (h *HTTPHandler) SetWebAuthnSessionRepository(repo WebAuthnSessionRepository) {
	h.webAuthnSessions = repo
}

// Register registers the authentication routes on the provided router.
func (h *HTTPHandler) Register(r chi.Router) {
	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.Ok(w, r, map[string]bool{"healthy": true})
	})

	// Public routes
	r.Get("/api/v1/setup/status", h.getSetupStatus)
	r.Get("/api/v1/oidc/resolve", h.oidcResolve)
	r.Get("/.well-known/webfinger", h.webfinger)
	r.Post("/api/v1/signup", h.signup)
	r.Post("/api/v1/setup", h.performSetup)
	r.Post("/api/v1/setup/password", h.completePasswordSetup)
	r.Post("/login/lookup", h.lookupUser)

	// Path-based multi-tenancy
	r.Route("/t/{tenant}", func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			HeaderName: "X-Tenant-ID",
			SlugResolver: func(ctx context.Context, slug string) (string, error) {
				return h.svc.ResolveTenantSlug(ctx, slug)
			},
		}))

		r.Post("/login", h.login)
		r.Post("/login/mfa", h.completeMFALogin)
		r.Post("/auth/mfa/complete", h.completeMFALogin)
		r.Post("/auth/mfa/step-up", h.completeMFALogin)
		r.Handle("/logout", http.HandlerFunc(h.logout))

		// OAuth2/OIDC
		r.Get("/.well-known/openid-configuration", h.oidcConfig)
		r.Get("/.well-known/jwks.json", h.jwks)
		r.Get("/oauth2/authorize", h.authorize)
		r.Post("/oauth2/token", h.token)
		r.Post("/oauth2/introspect", h.introspect)
		r.Post("/oauth2/revoke", h.revoke)
	})

	// Global aliases (header-based)
	r.Route("/auth", func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			HeaderName:    "X-Tenant-ID",
			AllowFallback: true,
			SlugResolver: func(ctx context.Context, slug string) (string, error) {
				return h.svc.ResolveTenantSlug(ctx, slug)
			},
		}))

		r.Post("/login", h.login)
		r.Get("/oauth/authorize", h.authorize)
		r.Post("/oauth/token", h.token)
		r.Post("/oauth/introspect", h.introspect)
		r.Post("/oauth/revoke", h.revoke)
		r.Get("/.well-known/jwks.json", h.jwks)
	})

	r.Route("/oauth", func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			HeaderName:    "X-Tenant-ID",
			AllowFallback: true,
			SlugResolver: func(ctx context.Context, slug string) (string, error) {
				return h.svc.ResolveTenantSlug(ctx, slug)
			},
		}))

		r.Get("/authorize", h.authorize)
		r.Post("/token", h.token)
		r.Post("/introspect", h.introspect)
		r.Post("/revoke", h.revoke)
	})

	r.Get("/.well-known/jwks.json", h.jwks)

	// Protected routes (Tenant Required)
	r.Group(func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			HeaderName: "X-Tenant-ID",
			SlugResolver: func(ctx context.Context, slug string) (string, error) {
				return h.svc.ResolveTenantSlug(ctx, slug)
			},
		}))

		// Device routes
		r.Route("/api/v1/devices", func(r chi.Router) {
			r.Post("/register", h.registerDevice)
			r.Post("/{id}/posture", h.updatePosture)
			r.Get("/", h.listDevices)
			r.Delete("/{id}", h.deleteDevice)
		})

		// Signal routes
		r.Post("/api/v1/signals/ingest", h.ingestSignal)
		r.Post("/social/login", h.socialLogin)

		// API v1 (MFA)
		r.Route("/api/v1", func(r chi.Router) {
			r.Post("/mfa/webauthn/register/begin", h.beginWebAuthnRegistration)
			r.Post("/mfa/webauthn/register/finish", h.finishWebAuthnRegistration)
			r.Post("/mfa/webauthn/login/begin", h.beginWebAuthnLogin)
			r.Post("/mfa/webauthn/login/finish", h.finishWebAuthnLogin)

			r.Route("/mfa/totp", func(r chi.Router) {
				r.Post("/enroll", h.enrollTOTP)
				r.Post("/verify", h.verifyTOTP)
				r.Delete("/", h.deleteTOTP)
				r.Get("/status", h.getTOTPStatus)
			})

			r.Post("/auth/mfa/complete", h.completeMFALogin)
			r.Post("/auth/mfa/step-up", h.completeMFALogin)
		})

		// User Portal (User Auth Required)
		r.Route("/api/v1/user", func(r chi.Router) {
			r.Use(middleware.RequireUserAuth(h.svc.ValidateToken))
			r.Get("/apps", h.getUserApps)
			r.Get("/profile", h.getUserProfile)
			r.Post("/profile", h.updateUserProfile)
		})

		r.Route("/api/v1/setup", func(r chi.Router) {
			r.Use(middleware.RequireUserAuth(h.svc.ValidateToken))
			r.Post("/password-link", h.createPasswordSetupLink)
		})
	})

	// SAML
	if samlProvider := h.svc.SAML(); samlProvider != nil {
		r.Mount("/saml", samlProvider)
	}
}

// Router registers the authentication routes and returns a new router.
func (h *HTTPHandler) Router() http.Handler {
	r := chi.NewRouter()
	h.Register(r)
	return r
}

// BrandingRouter registers the branding routes.
func (h *HTTPHandler) BrandingRouter() http.Handler {
	r := chi.NewRouter()

	r.Get("/", h.getBranding)
	r.Put("/", h.updateBranding)

	return r
}

func (h *HTTPHandler) tenantID(r *http.Request) (string, bool) {
	return middleware.TenantIDFromContext(r.Context())
}

func (h *HTTPHandler) getSetupStatus(w http.ResponseWriter, r *http.Request) {
	required, err := h.svc.GetSystemSetupStatus(r.Context())
	if err != nil {
		h.logger.Error("Failed to check setup status", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}
	response.Ok(w, r, map[string]bool{"setup_required": required})
}

func (h *HTTPHandler) tenantSlugForID(ctx context.Context, tenantID string) string {
	if tenantID == "" {
		return ""
	}
	impl, ok := h.svc.(*authService)
	if !ok || impl.tenantStore == nil {
		return ""
	}
	slug, err := impl.tenantStore.GetSlugByID(ctx, tenantID)
	if err != nil {
		h.logger.Warn("Failed to resolve tenant slug", zap.String("tenant_id", tenantID), zap.Error(err))
		return ""
	}
	return slug
}

// SetupRequest holds credentials for system owner setup.
type SetupRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type PasswordSetupLinkRequest struct {
	UserID       string `json:"user_id" validate:"required"`
	Mode         string `json:"mode" validate:"required,oneof=invite reset"`
	ExpiresHours int    `json:"expires_hours"`
}

type CompletePasswordSetupRequest struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

func (h *HTTPHandler) performSetup(w http.ResponseWriter, r *http.Request) {
	var req SetupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	token, err := h.svc.PerformSystemSetup(r.Context(), req.Email, req.Password)
	if err != nil {
		h.logger.Error("Setup failed", zap.Error(err))
		if strings.Contains(err.Error(), "not required") {
			response.JSON(w, r, http.StatusForbidden, map[string]string{"error": "System setup is not available"})
			return
		}
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "Setup failed"})
		return
	}

	h.setAuthCookies(w, token, "")

	response.Ok(w, r, map[string]interface{}{
		"token":       token,
		"tenant_id":   "admin-system",
		"tenant_slug": "admin",
		"message":     "System owner created successfully",
	})
}

func (h *HTTPHandler) createPasswordSetupLink(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.tenantID(r)
	if !ok {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "tenant context required"})
		return
	}

	var req PasswordSetupLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	impl, ok := h.svc.(*authService)
	if !ok {
		h.logger.Error("service type assertion failed for password setup link")
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "internal service error"})
		return
	}

	token, expiresAt, err := impl.generatePasswordSetupToken(tenantID, req.UserID, req.Mode, req.ExpiresHours)
	if err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	baseUIURL := strings.TrimRight(h.svc.UIURL(), "/")
	setupURL := fmt.Sprintf("%s/set-password?token=%s&mode=%s", baseUIURL, url.QueryEscape(token), url.QueryEscape(req.Mode))

	response.Ok(w, r, map[string]interface{}{
		"mode":       req.Mode,
		"token":      token,
		"url":        setupURL,
		"expires_at": expiresAt.Format(time.RFC3339),
	})
}

func (h *HTTPHandler) completePasswordSetup(w http.ResponseWriter, r *http.Request) {
	var req CompletePasswordSetupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	impl, ok := h.svc.(*authService)
	if !ok {
		h.logger.Error("service type assertion failed for complete password setup")
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "internal service error"})
		return
	}

	if err := impl.setPasswordWithSetupToken(r.Context(), req.Token, req.Password); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, map[string]string{"message": "password set successfully"})
}

func (h *HTTPHandler) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to bind login request", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.logger.Error("Login request validation failed", zap.Error(err))
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	deviceID := r.Header.Get("X-Device-ID")
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	tenantID, _ := h.tenantID(r)
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}

	// Check account lockout
	if h.loginAttemptStore != nil && tenantID != "" {
		locked, lockedUntil, _ := h.loginAttemptStore.IsLocked(r.Context(), tenantID, req.Username)
		if locked {
			h.logger.Warn("Login attempt for locked account", zap.String("username", req.Username))
			response.JSON(w, r, http.StatusTooManyRequests, map[string]interface{}{
				"error":             "account_locked",
				"error_description": "Too many failed login attempts. Please try again later.",
				"locked_until":      lockedUntil.Format("2006-01-02T15:04:05Z07:00"),
			})
			return
		}
	}

	userAgent := r.UserAgent()
	clientOSVersion := r.Header.Get("X-OS-Version")
	token, err := h.svc.Login(r.Context(), req.Username, req.Password, deviceID, userAgent, ip, clientOSVersion)
	if err != nil {
		h.logger.Error("Login failed", zap.Error(err))

		// Record failed attempt
		if h.loginAttemptStore != nil && tenantID != "" {
			_ = h.loginAttemptStore.RecordAttempt(r.Context(), tenantID, req.Username, ip, false)
			failures, _ := h.loginAttemptStore.GetRecentFailures(r.Context(), tenantID, req.Username)
			if failures >= MaxFailedAttempts {
				_ = h.loginAttemptStore.LockAccount(r.Context(), tenantID, req.Username)
				h.logger.Warn("Account locked due to too many failed attempts", zap.String("username", req.Username))
			}
		}

		if errors.Is(err, ErrInvalidCredentials) {
			h.respondOAuthError(w, r, ErrInvalidCredentials)
		} else if errors.Is(err, ErrMFARequired) {
			response.JSON(w, r, http.StatusAccepted, map[string]interface{}{
				"mfa_required":  true,
				"step_up_token": token,
				"error":         "mfa_required",
				"message":       "Additional authentication required due to risk assessment",
			})
		} else {
			response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return
	}

	// Record successful attempt and clear any lockout
	if h.loginAttemptStore != nil && tenantID != "" {
		_ = h.loginAttemptStore.RecordAttempt(r.Context(), tenantID, req.Username, ip, true)
		_ = h.loginAttemptStore.UnlockAccount(r.Context(), tenantID, req.Username)
	}

	// Check if user has TOTP enabled
	if h.svc.TOTP() != nil && tenantID != "" {
		totpSecret, _ := h.svc.TOTP().GetByIdentity(r.Context(), tenantID, req.Username)
		if totpSecret != nil && totpSecret.Verified {
			response.Ok(w, r, map[string]interface{}{
				"mfa_required":  true,
				"pending_token": token,
				"user_id":       req.Username,
			})
			return
		}
	}

	h.setAuthCookies(w, token, "")

	claims, _ := h.svc.ValidateToken(token)
	roles := []string{}
	if claims != nil {
		roles = claims.Roles
	}

	response.Ok(w, r, LoginResponse{
		Token:      token,
		Roles:      roles,
		TenantID:   tenantID,
		TenantSlug: h.tenantSlugForID(r.Context(), tenantID),
	})
}

func (h *HTTPHandler) lookupUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID := r.Header.Get("X-Tenant-ID")

	result, err := h.svc.LookupUser(r.Context(), tenantID, req.Email)
	if err != nil {
		h.logger.Warn("Lookup failed", zap.Error(err))
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	response.Ok(w, r, result)
}

func (h *HTTPHandler) oidcResolve(w http.ResponseWriter, r *http.Request) {
	email := strings.TrimSpace(r.URL.Query().Get("email"))
	if email == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "email query param is required"})
		return
	}

	if _, err := mail.ParseAddress(email); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid email"})
		return
	}

	result, err := h.svc.LookupUser(r.Context(), "", email)
	if err != nil {
		h.logger.Warn("OIDC resolve failed", zap.String("email", email), zap.Error(err))
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "tenant not found for user"})
		return
	}

	tenantSlug := result.TenantSlug
	if tenantSlug == "" {
		tenantSlug = h.tenantSlugForID(r.Context(), result.TenantID)
	}
	if tenantSlug == "" {
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "tenant slug not found"})
		return
	}

	baseIssuer := strings.TrimRight(h.svc.GetOIDCConfiguration().Issuer, "/")
	issuer := fmt.Sprintf("%s/t/%s", baseIssuer, tenantSlug)

	response.Ok(w, r, map[string]interface{}{
		"tenant_id":      result.TenantID,
		"tenant_slug":    tenantSlug,
		"issuer":         issuer,
		"discovery_url":  fmt.Sprintf("%s/.well-known/openid-configuration", issuer),
		"jwks_uri":       fmt.Sprintf("%s/.well-known/jwks.json", issuer),
		"authorization":  fmt.Sprintf("%s/oauth2/authorize", issuer),
		"token_endpoint": fmt.Sprintf("%s/oauth2/token", issuer),
	})
}

func (h *HTTPHandler) webfinger(w http.ResponseWriter, r *http.Request) {
	resource := strings.TrimSpace(r.URL.Query().Get("resource"))
	if resource == "" {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "resource query param is required"})
		return
	}

	const acctPrefix = "acct:"
	if !strings.HasPrefix(strings.ToLower(resource), acctPrefix) {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "resource must be in acct:user@example.com format"})
		return
	}

	email := strings.TrimSpace(resource[len(acctPrefix):])
	if _, err := mail.ParseAddress(email); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": "invalid acct resource email"})
		return
	}

	result, err := h.svc.LookupUser(r.Context(), "", email)
	if err != nil {
		h.logger.Warn("WebFinger resolve failed", zap.String("resource", resource), zap.Error(err))
		response.JSON(w, r, http.StatusNotFound, map[string]string{"error": "resource not found"})
		return
	}

	tenantSlug := result.TenantSlug
	if tenantSlug == "" {
		tenantSlug = h.tenantSlugForID(r.Context(), result.TenantID)
	}

	issuer := fmt.Sprintf("%s/t/%s", strings.TrimRight(h.svc.GetOIDCConfiguration().Issuer, "/"), tenantSlug)

	response.Ok(w, r, map[string]interface{}{
		"subject": resource,
		"links": []map[string]string{
			{
				"rel":  "http://openid.net/specs/connect/1.0/issuer",
				"href": issuer,
			},
		},
	})
}

// MFALoginRequest is the request to complete MFA login.
type MFALoginRequest struct {
	PendingToken string `json:"pending_token" validate:"required"`
	TOTPCode     string `json:"totp_code" validate:"required"`
	UserID       string `json:"user_id" validate:"required"`
}

func (h *HTTPHandler) completeMFALogin(w http.ResponseWriter, r *http.Request) {
	var req MFALoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	tenantID, _ := h.tenantID(r)
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}

	finalToken, err := h.svc.LoginWithMFAStepUp(r.Context(), req.PendingToken, req.TOTPCode)
	if err != nil {
		h.logger.Error("MFA completion failed", zap.Error(err))
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	h.setAuthCookies(w, finalToken, "")

	claims, _ := h.svc.ValidateToken(finalToken)
	roles := []string{}
	if claims != nil {
		roles = claims.Roles
	}

	response.Ok(w, r, LoginResponse{
		Token:      finalToken,
		Roles:      roles,
		TenantID:   tenantID,
		TenantSlug: h.tenantSlugForID(r.Context(), tenantID),
	})
}

func (h *HTTPHandler) logout(w http.ResponseWriter, r *http.Request) {
	h.clearAuthCookies(w)
	response.Ok(w, r, map[string]string{"message": "logged out successfully"})
}

func (h *HTTPHandler) authorize(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	req := AuthorizeRequest{
		ClientID:     q.Get("client_id"),
		RedirectURI:  q.Get("redirect_uri"),
		ResponseType: q.Get("response_type"),
		Scope:        q.Get("scope"),
		State:        q.Get("state"),
		Nonce:        q.Get("nonce"),
	}

	if err := h.validate.Struct(req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	cookie, err := r.Cookie(AccessTokenCookie)
	if err != nil {
		loginURL := fmt.Sprintf("%s/login?redirect_uri=%s", h.svc.UIURL(), url.QueryEscape(r.URL.String()))
		http.Redirect(w, r, loginURL, http.StatusFound)
		return
	}

	var userID string
	claims, err := h.svc.ValidateToken(cookie.Value)
	if err == nil {
		userID = claims.Subject
	}

	if userID == "" {
		response.JSON(w, r, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	tenantID, _ := h.tenantID(r)
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}

	if tenantID != "" && h.appStore != nil {
		app, err := h.appStore.GetByClientID(r.Context(), req.ClientID)
		if err != nil {
			response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "failed to verify app assignment"})
			return
		}
		if app != nil {
			if app.TenantID != tenantID {
				response.JSON(w, r, http.StatusForbidden, map[string]string{
					"error":             "access_denied",
					"error_description": "This application belongs to a different tenant.",
				})
				return
			}

			assigned, _ := h.appStore.CheckAssignment(r.Context(), tenantID, app.ID, userID)
			if !assigned && app.OwnerID != userID {
				response.JSON(w, r, http.StatusForbidden, map[string]string{
					"error":             "access_denied",
					"error_description": "You are not assigned to this application.",
				})
				return
			}
		}
	}

	resp, err := h.svc.Authorize(r.Context(), userID, req)
	if err != nil {
		svcErr := &Error{}
		if errors.As(err, &svcErr) {
			h.respondOAuthError(w, r, svcErr)
			return
		}
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	http.Redirect(w, r, resp.RedirectURI, http.StatusFound)
}

func (h *HTTPHandler) token(w http.ResponseWriter, r *http.Request) {
	var req TokenRequest
	if err := r.ParseForm(); err == nil {
		req.GrantType = r.FormValue("grant_type")
		req.Code = r.FormValue("code")
		req.RedirectURI = r.FormValue("redirect_uri")
		req.RefreshToken = r.FormValue("refresh_token")
		req.ClientID = r.FormValue("client_id")
		req.ClientSecret = r.FormValue("client_secret")
	} else {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	if req.ClientID == "" {
		user, pass, ok := r.BasicAuth()
		if ok {
			req.ClientID = user
			req.ClientSecret = pass
		}
	}

	resp, err := h.svc.Token(r.Context(), req)
	if err != nil {
		svcErr := &Error{}
		if errors.As(err, &svcErr) {
			h.respondOAuthError(w, r, svcErr)
			return
		}
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	response.Ok(w, r, resp)
}

func (h *HTTPHandler) jwks(w http.ResponseWriter, r *http.Request) {
	response.Ok(w, r, h.svc.JWKS())
}

func (h *HTTPHandler) oidcConfig(w http.ResponseWriter, r *http.Request) {
	config := h.svc.GetOIDCConfiguration()
	tenantParam := chi.URLParam(r, "tenant")
	if tenantParam != "" {
		tenantPath := fmt.Sprintf("/t/%s", tenantParam)
		config.Issuer = fmt.Sprintf("%s%s", config.Issuer, tenantPath)
		config.AuthorizationEndpoint = strings.Replace(config.AuthorizationEndpoint, "/oauth2", tenantPath+"/oauth2", 1)
		config.TokenEndpoint = strings.Replace(config.TokenEndpoint, "/oauth2", tenantPath+"/oauth2", 1)
		config.JwksURI = strings.Replace(config.JwksURI, "/.well-known", tenantPath+"/.well-known", 1)
		config.UserinfoEndpoint = strings.Replace(config.UserinfoEndpoint, "/api", tenantPath+"/api", 1)
	}
	response.Ok(w, r, config)
}

func (h *HTTPHandler) introspect(w http.ResponseWriter, r *http.Request) {
	var req IntrospectRequest
	_ = r.ParseForm()
	req.Token = r.FormValue("token")
	req.TokenTypeHint = r.FormValue("token_type_hint")
	req.ClientID = r.FormValue("client_id")
	req.ClientSecret = r.FormValue("client_secret")

	resp, err := h.svc.Introspect(r.Context(), req)
	if err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	response.Ok(w, r, resp)
}

func (h *HTTPHandler) revoke(w http.ResponseWriter, r *http.Request) {
	var req RevokeRequest
	_ = r.ParseForm()
	req.Token = r.FormValue("token")
	req.TokenTypeHint = r.FormValue("token_type_hint")
	req.ClientID = r.FormValue("client_id")
	req.ClientSecret = r.FormValue("client_secret")

	if err := h.svc.Revoke(r.Context(), req); err != nil {
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusOK)
}

// SignupRequest is the request to create a new tenant and admin user.
type SignupRequest struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8"`
	CompanyName string `json:"company_name" validate:"required"`
	Plan        string `json:"plan"` // Optional, defaults to "free" in service
}

func (h *HTTPHandler) signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, r, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	token, tenantID, tenantSlug, err := h.svc.SignUp(r.Context(), req.Email, req.Password, req.CompanyName, req.Plan)
	if err != nil {
		h.logger.Error("Signup failed", zap.Error(err))
		response.JSON(w, r, http.StatusInternalServerError, map[string]string{"error": "Signup failed"})
		return
	}

	h.setAuthCookies(w, token, "")

	response.JSON(w, r, http.StatusCreated, map[string]interface{}{
		"token":       token,
		"tenant_id":   tenantID,
		"tenant_slug": tenantSlug,
		"message":     "Signup successful",
	})
}

func (h *HTTPHandler) respondOAuthError(w http.ResponseWriter, r *http.Request, err *Error) {
	status := http.StatusBadRequest
	if err.Code == ErrInvalidCredentials.Code {
		status = http.StatusUnauthorized
	}
	response.JSON(w, r, status, map[string]string{
		"error":             err.Code,
		"error_description": err.Message,
	})
}
