package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/dhawalhost/gokit/database"
	"github.com/dhawalhost/gokit/logger"
	"github.com/dhawalhost/gokit/observability"
	"github.com/dhawalhost/wardseal/internal/audit"
	"github.com/dhawalhost/wardseal/internal/connector"
	"github.com/dhawalhost/wardseal/internal/connector/azuread"
	"github.com/dhawalhost/wardseal/internal/connector/google"
	"github.com/dhawalhost/wardseal/internal/connector/ldap"
	"github.com/dhawalhost/wardseal/internal/connector/scim"
	"github.com/dhawalhost/wardseal/internal/governance"
	"github.com/dhawalhost/wardseal/internal/oauthclient"
	"github.com/dhawalhost/wardseal/internal/policy"
	"github.com/dhawalhost/wardseal/internal/rbac"
	"github.com/dhawalhost/wardseal/internal/sso"
	"github.com/dhawalhost/wardseal/internal/webhook"
	"github.com/dhawalhost/wardseal/pkg/config"
	"github.com/dhawalhost/wardseal/pkg/middleware"
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

	db, err := database.New(context.Background(), cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer func() { _ = db.Close() }()

	gormDB := db.GORM

	clientRepo := oauthclient.NewRepository(gormDB)
	reqRepo := governance.NewRepository(gormDB)
	orgRepo := governance.NewOrganizationRepository(gormDB)

	dirSvcURL := cfg.Governance.DirectoryServiceURL
	dirClient := governance.NewDirectoryClient(dirSvcURL, cfg.Directory.ServiceAuthHeader, cfg.Directory.ServiceAuthToken)

	policyEngine := policy.NewSimpleEngine()
	svc := governance.NewService(clientRepo, reqRepo, orgRepo, dirClient, policyEngine)

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
	observability.InitMetrics("govsvc")
	shutdownTracer, err := observability.InitTracer(context.Background(), cfg.Telemetry)
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	} else {
		defer func() { _ = shutdownTracer(context.Background()) }()
	}

	r.Handle("/metrics", observability.MetricsHandler())
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	campaignRepo := governance.NewCampaignRepository(gormDB)
	campaignSvc := governance.NewCampaignService(campaignRepo, dirClient)
	webhookSvc := webhook.NewService(gormDB)

	govHandlers := governance.NewHTTPHandler(svc, campaignSvc, webhookSvc, log)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.TenantExtractor(middleware.TenantConfig{
			HeaderName:   "X-Tenant-ID",
			SlugResolver: dirClient.ResolveTenantSlug,
		}))

		// Governance Core
		govHandlers.Register(r)

		// RBAC handlers
		rbacRepo := rbac.NewRepository(gormDB)
		rbacSvc := rbac.NewService(rbacRepo)
		rbacHandlers := rbac.NewHTTPHandler(rbacSvc, log)
		rbacHandlers.Register(r)

		// Audit handlers
		auditRepo := audit.NewRepository(gormDB)
		auditSvc := audit.NewService(auditRepo)
		auditHandlers := audit.NewHTTPHandler(auditSvc, log)
		r.Mount("/audit", auditHandlers.Router())

		// Domain verification handlers
		domainVerifyHandler := governance.NewDomainVerificationHandler(gormDB, orgRepo, log)
		domainVerifyHandler.Register(r)

		// SSO handlers
		ssoRepo := sso.NewRepository(gormDB)
		ssoSvc := sso.NewService(ssoRepo)
		ssoHandlers := sso.NewHTTPHandler(ssoSvc, log)
		r.Mount("/sso", ssoHandlers.Router())

		// Connector Framework
		connRegistry := connector.NewRegistry()
		connRegistry.Register("scim", scim.New)
		connRegistry.Register("ldap", ldap.New)
		connRegistry.Register("azure-ad", azuread.New)
		connRegistry.Register("google", google.New)

		connRepo := connector.NewRepository(gormDB)
		connSvc := connector.NewService(connRepo, connRegistry)
		connHandlers := connector.NewHTTPHandler(connSvc, log)
		r.Mount("/connectors", connHandlers.Router())
	})

	log.Info("Governance service starting", zap.String("addr", ":8082"))
	srv := &http.Server{
		Addr:         ":8082",
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Error("Governance service failed", zap.Error(err))
		os.Exit(1)
	}
}
