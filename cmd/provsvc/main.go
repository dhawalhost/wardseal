package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/dhawalhost/gokit/logger"
	"github.com/dhawalhost/gokit/observability"
	"github.com/dhawalhost/wardseal/internal/provisioning"
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

	// Observability
	observability.InitMetrics("provsvc")
	shutdownTracer, err := observability.InitTracer(context.Background(), cfg.Telemetry)
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	} else {
		defer func() { _ = shutdownTracer(context.Background()) }()
	}

	svc := provisioning.NewService()

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
			AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	r.Handle("/metrics", observability.MetricsHandler())
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	provHandlers := provisioning.NewHTTPHandler(svc, log)
	r.Mount("/", provHandlers.Router())

	log.Info("Provisioning service starting", zap.String("addr", ":8084"))
	srv := &http.Server{
		Addr:         ":8084",
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Error("Provisioning service failed", zap.Error(err))
		os.Exit(1)
	}
}
