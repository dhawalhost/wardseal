package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/dhawalhost/gokit/database"
	"github.com/dhawalhost/gokit/logger"
	"github.com/dhawalhost/gokit/observability"
	"github.com/dhawalhost/wardseal/internal/directory"
	"github.com/dhawalhost/wardseal/internal/scim"
	"github.com/dhawalhost/wardseal/pkg/config"
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

	repo := directory.NewRepository(db.GORM)
	svc := directory.NewService(repo)

	serviceToken := cfg.Directory.ServiceAuthToken
	if serviceToken.IsEmpty() {
		serviceToken = "dev-internal-token" //nolint:gosec // G101: dev-only fallback
		log.Warn("SERVICE_AUTH_TOKEN not set, using development default")
	}
	serviceHeader := cfg.Directory.ServiceAuthHeader

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
			AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID", "X-User-ID", "X-Device-ID", "X-OS-Version"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	// Observability
	observability.InitMetrics("dirsvc")
	shutdownTracer, err := observability.InitTracer(context.Background(), cfg.Telemetry)
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	} else {
		defer func() { _ = shutdownTracer(context.Background()) }()
	}

	r.Handle("/metrics", observability.MetricsHandler())

	// Domain Handlers
	dirHandlers := directory.NewHTTPHandler(svc, log, directory.HTTPHandlerConfig{
		ServiceAuthToken:  serviceToken,
		ServiceAuthHeader: serviceHeader,
	})
	r.Mount("/", dirHandlers.Router())

	scimSvc := scim.NewService(svc)
	scimHandlers := scim.NewHTTPHandler(scimSvc, repo, serviceToken, log)
	r.Mount("/scim/v2", scimHandlers.Router())

	log.Info("Directory service starting", zap.String("addr", ":8081"))
	srv := &http.Server{
		Addr:         ":8081",
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Error("Directory service failed", zap.Error(err))
		os.Exit(1)
	}
}
