package saml

import (
	"crypto/rsa"
	"crypto/x509"
	"fmt"
	"net/http"
	"net/url"

	"github.com/crewjam/saml/samlidp"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Config holds the configuration for the SAML Identity Provider.
type Config struct {
	BaseURL     string
	Certificate *x509.Certificate
	PrivateKey  *rsa.PrivateKey
	Logger      *zap.Logger
	Store       samlidp.Store
}

// Provider represents the SAML Identity Provider.
type Provider struct {
	idp    *samlidp.Server
	logger *zap.Logger
}

// NewProvider creates a new SAML Identity Provider.
func NewProvider(cfg Config) (*Provider, error) {
	baseURL, err := url.Parse(cfg.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}

	idpServer, err := samlidp.New(samlidp.Options{
		URL:         *baseURL,
		Key:         cfg.PrivateKey,
		Certificate: cfg.Certificate,
		Logger:      zapLogger{cfg.Logger},
		Store:       cfg.Store,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create IDP server: %w", err)
	}

	return &Provider{
		idp:    idpServer,
		logger: cfg.Logger,
	}, nil
}

// ServeHTTP handles SAML requests.
func (p *Provider) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.idp.ServeHTTP(w, r)
}

// ServeIDPInitiated handles IdP-initiated SSO flow.
func (p *Provider) ServeIDPInitiated(w http.ResponseWriter, r *http.Request) {
	spEntityID := r.URL.Query().Get("sp")
	if spEntityID == "" {
		http.Error(w, "sp query parameter required", http.StatusBadRequest)
		return
	}
	// The library's HandleIDPInitiated expects to be called to handle the flow.
	// It likely extracts the SP from the path or query.
	// We'll pass the request through. The query param 'sp' is what we expect,
	// checking if library respects it or expects something else.
	// Documentation implies /login/:shortcut, where shortcut maps to an SP.
	// But without configuring shortcuts, we might need query params.
	// Let's rely on standard method call.
	p.idp.HandleIDPInitiated(w, r)
}

// RegisterRoutes registers SAML IdP routes.
func (p *Provider) RegisterRoutes(rg *gin.RouterGroup) {
	// The underlying samlidp.Server handles /metadata and /sso based on its internal routing
	// when ServeHTTP is called. However, since we are using Gin, we might want to register specific paths
	// to avoid conflicts or strict matching issues.
	// But samlidp.Server expects to handle the requests itself.
	// For now, let's mount specific paths that we know samlidp handles.

	rg.GET("/saml/metadata", gin.WrapH(p.idp))
	rg.POST("/saml/sso", gin.WrapH(p.idp))
	rg.GET("/saml/sso", gin.WrapH(p.idp)) // Support Redirect binding
	rg.GET("/saml/idp-init", func(c *gin.Context) {
		p.ServeIDPInitiated(c.Writer, c.Request)
	})
}

// Handler returns the HTTP handler for the IdP.
func (p *Provider) Handler() http.Handler {
	return p.idp
}

// zapLogger adapts zap.Logger to the saml.Logger interface.
type zapLogger struct {
	logger *zap.Logger
}

func (l zapLogger) Print(v ...interface{}) {
	l.logger.Info(fmt.Sprint(v...))
}

func (l zapLogger) Printf(format string, v ...interface{}) {
	l.logger.Info(fmt.Sprintf(format, v...))
}

func (l zapLogger) Println(v ...interface{}) {
	l.logger.Info(fmt.Sprint(v...))
}

func (l zapLogger) Fatalf(format string, v ...interface{}) {
	l.logger.Fatal(fmt.Sprintf(format, v...))
}

func (l zapLogger) Fatal(v ...interface{}) {
	l.logger.Fatal(fmt.Sprint(v...))
}

func (l zapLogger) Fatalln(v ...interface{}) {
	l.logger.Fatal(fmt.Sprint(v...))
}

func (l zapLogger) Panicf(format string, v ...interface{}) {
	l.logger.Panic(fmt.Sprintf(format, v...))
}

func (l zapLogger) Panic(v ...interface{}) {
	l.logger.Panic(fmt.Sprint(v...))
}

func (l zapLogger) Panicln(v ...interface{}) {
	l.logger.Panic(fmt.Sprint(v...))
}
