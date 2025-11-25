package auth

import (
	"net/http"

	"github.com/dhawalhost/velverify/internal/auth/endpoint"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10" // Import validator
	"go.uber.org/zap"
)

// HTTPHandler represents the HTTP API handlers for the auth service.
type HTTPHandler struct {
	svc    Service
	logger *zap.Logger
	validate *validator.Validate // Add validator instance
}

// NewHTTPHandler creates a new HTTPHandler.
func NewHTTPHandler(svc Service, logger *zap.Logger) *HTTPHandler {
	return &HTTPHandler{svc: svc, logger: logger, validate: validator.New()} // Initialize validator
}

// RegisterRoutes registers the authentication routes.
func (h *HTTPHandler) RegisterRoutes(router *gin.Engine) {
	router.POST("/login", h.login)
	router.GET("/oauth2/authorize", h.authorize)
	router.POST("/oauth2/token", h.token)
	router.GET("/.well-known/jwks.json", h.jwks)
}

func (h *HTTPHandler) login(c *gin.Context) {
	var req endpoint.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind login request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil { // Validate the request
		h.logger.Error("Login request validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.svc.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		h.logger.Error("Login failed", zap.Error(err))
		if err == ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, endpoint.LoginResponse{Token: token})
}

func (h *HTTPHandler) authorize(c *gin.Context) {
	var req endpoint.AuthorizeRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		h.logger.Error("Failed to bind authorize request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil { // Validate the request
		h.logger.Error("Authorize request validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Authorize(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Authorize failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Redirect(http.StatusFound, resp.RedirectURI)
}

func (h *HTTPHandler) token(c *gin.Context) {
	var req endpoint.TokenRequest
	// Gin's ShouldBind handles different content types
	if err := c.ShouldBind(&req); err != nil {
		h.logger.Error("Failed to bind token request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validate.Struct(req); err != nil { // Validate the request
		h.logger.Error("Token request validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Token(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Token generation failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *HTTPHandler) jwks(c *gin.Context) {
	// Assuming JWKS() method is available on the service
	jwks := h.svc.JWKS()
	c.JSON(http.StatusOK, jwks)
}
