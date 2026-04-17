package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/dhawalhost/gokit/database"
	"github.com/dhawalhost/gokit/logger"
	"github.com/dhawalhost/gokit/observability"
	"github.com/dhawalhost/wardseal/internal/auth"
	"github.com/dhawalhost/wardseal/internal/license"
	"github.com/dhawalhost/wardseal/internal/oauthclient"
	"github.com/dhawalhost/wardseal/internal/saml"
	"github.com/dhawalhost/wardseal/pkg/config"
	"github.com/dhawalhost/wardseal/pkg/kms"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.uber.org/zap"
)

func main() {
	// Load centralized configuration
	cfg := config.MustLoad()

	isDev := cfg.Environment == config.Development
	log, err := logger.New(cfg.Log.Level, isDev)
	if err != nil {
		panic(err)
	}
	defer func() { _ = log.Sync() }()

	// Enterprise License Verification
	if cfg.License.Required {
		log.Info("Checking Enterprise License...")

		pubKey, err := os.ReadFile(cfg.License.PublicKeyPath)
		if err != nil {
			log.Fatal("Failed to read license public key", zap.Error(err))
		}

		mgr, err := license.NewManager(pubKey)
		if err != nil {
			log.Fatal("Failed to initialize license manager", zap.Error(err))
		}

		if cfg.License.Key.IsEmpty() {
			log.Fatal("LICENSE_KEY environment variable/vault secret is required for enterprise edition")
		}

		lic, err := mgr.Verify(cfg.License.Key)
		if err != nil {
			log.Fatal("Invalid license key", zap.Error(err))
		}

		log.Info("Enterprise License Verified",
			zap.String("customer", lic.CustomerName),
			zap.Time("expires_at", lic.ExpiresAt),
			zap.String("plan", lic.Plan))
	}

	directoryServiceURL := cfg.Auth.DirectoryServiceURL
	serviceToken := cfg.Auth.ServiceAuthToken
	if serviceToken.IsEmpty() {
		serviceToken = "dev-internal-token"
		log.Warn("SERVICE_AUTH_TOKEN not set, using development default")
	}
	serviceHeader := cfg.Auth.ServiceAuthHeader

	db, err := database.New(context.Background(), cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer func() { _ = db.Close() }()

	gormDB := db.GORM
	clientStore := oauthclient.NewRepository(gormDB)
	samlStore := saml.NewStore(gormDB)
	deviceStore := auth.NewDeviceRepository(gormDB)
	signalStore := auth.NewSignalRepository(gormDB)
	webauthnStore := auth.NewWebAuthnRepository(gormDB)
	brandingStore := auth.NewBrandingRepository(gormDB)
	ssoProviderStore := auth.NewSSOProviderRepository(gormDB)
	tenantStore := auth.NewTenantRepository(gormDB)
	federationStore := auth.NewFederationRepository(gormDB)

	authServiceURL := cfg.Auth.BaseURL

	// Initialize persistent repositories for production durability
	codeStore := auth.NewAuthorizationCodeRepository(gormDB)
	refreshStore := auth.NewRefreshTokenRepository(gormDB)
	revocationStore := auth.NewRevocationRepository(gormDB)
	totpStore := auth.NewTOTPRepository(gormDB)
	appStore := auth.NewDeveloperAppRepository(gormDB)

	// Initialize Key Management Service
	kmsConfig := kms.Config{
		Provider:       cfg.KMS.Provider,
		PrivateKeyPath: cfg.KMS.PrivateKeyPath,
		PublicKeyPath:  cfg.KMS.PublicKeyPath,
		VaultAddr:      cfg.KMS.VaultAddr,
		VaultToken:     cfg.KMS.VaultToken,
		VaultKeyName:   cfg.KMS.VaultKeyName,
		VaultKeyPath:   cfg.KMS.VaultKeyPath,
		VaultNamespace: cfg.KMS.VaultNamespace,
		VaultRoleID:    cfg.KMS.VaultRoleID,
		VaultSecretID:  cfg.KMS.VaultSecretID,
	}

	signer, err := kms.NewSigner(kmsConfig)
	if err != nil {
		log.Fatal("Failed to initialize KMS signer", zap.Error(err))
	}
	defer func() { _ = signer.Close() }()

	svc, err := auth.NewService(auth.Config{
		DirectoryServiceURL: directoryServiceURL,
		ServiceAuthToken:    serviceToken,
		ServiceAuthHeader:   serviceHeader,
		ClientStore:         clientStore,
		SAMLStore:           samlStore,
		DeviceStore:         deviceStore,
		SignalStore:         signalStore,
		WebAuthnStore:       webauthnStore,
		BrandingStore:       brandingStore,
		FederationStore:     federationStore,
		BaseURL:             authServiceURL,
		Signer:              signer,
		CodeStore:           codeStore,
		RefreshStore:        refreshStore,
		RevocationStore:     revocationStore,
		TOTPStore:           totpStore,
		SSOProviderStore:    ssoProviderStore,
		TenantStore:         tenantStore,
		AppStore:            appStore,
		UIURL:               cfg.Auth.UIURL,
		DeploymentMode:      cfg.Auth.DeploymentMode,
	})
	if err != nil {
		log.Fatal("Failed to create auth service", zap.Error(err))
	}

	r := chi.NewRouter()

	// Global Middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	// CORS configuration
	if len(cfg.Governance.CORSAllowedOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   cfg.Governance.CORSAllowedOrigins,
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID", "X-User-ID", "X-Device-ID", "X-OS-Version"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	// Observability
	observability.InitMetrics("authsvc")
	shutdownTracer, err := observability.InitTracer(context.Background(), cfg.Telemetry)
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	} else {
		defer func() { _ = shutdownTracer(context.Background()) }()
	}

	// Initialize login attempt repository for brute-force protection
	loginAttemptStore := auth.NewLoginAttemptRepository(gormDB)

	authHandlers := auth.NewHTTPHandler(svc, log, loginAttemptStore, appStore)
	if cfg.Redis.Addr != "" {
		webAuthnSessionStore, err := auth.NewRedisWebAuthnSessionRepository(auth.RedisWebAuthnSessionStoreConfig{
			Addr:      cfg.Redis.Addr,
			Password:  cfg.Redis.Password,
			DB:        cfg.Redis.DB,
			TTL:       cfg.Auth.WebAuthnSessionTTL,
			KeyPrefix: "authsvc:webauthn:session:",
		})
		if err == nil {
			authHandlers.SetWebAuthnSessionRepository(webAuthnSessionStore)
			log.Info("Using Redis-backed WebAuthn session repository", zap.String("redis_addr", cfg.Redis.Addr))
		}
	}

	// Register Domain Routes
	authHandlers.Register(r)
	r.Mount("/branding", authHandlers.BrandingRouter())

	r.Handle("/metrics", observability.MetricsHandler())

	// SAML Management
	samlHandlers := saml.NewHTTPHandler(samlStore, log)
	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/saml", samlHandlers.Router())

		// Developer Portal API
		developerHandlers := auth.NewDeveloperAPIHandler(gormDB, log)
		r.Mount("/", developerHandlers.Router())
	})

	log.Info("Auth service starting", zap.String("addr", ":8080"))
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Error("Auth service failed", zap.Error(err))
		os.Exit(1)
	}
}
