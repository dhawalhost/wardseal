package main

import (
	"context"
	"os"

	"github.com/dhawalhost/wardseal/internal/directory"
	"github.com/dhawalhost/wardseal/internal/scim"
	"github.com/dhawalhost/wardseal/pkg/database"
	"github.com/dhawalhost/wardseal/pkg/logger"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	"github.com/dhawalhost/wardseal/pkg/observability"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

func main() {
	log := logger.NewFromEnv()
	defer log.Sync()

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	// Database connection
	dbConfig := database.Config{
		Host:     dbHost,
		Port:     5432,
		User:     "user",
		Password: "password",
		DBName:   "identity_platform",
		SSLMode:  "disable",
	}

	db, err := database.NewConnection(dbConfig)
	if err != nil {
		log.Error("Failed to connect to database", zap.Error(err))
		os.Exit(1)
	}

	svc := directory.NewService(db)

	serviceToken := os.Getenv("SERVICE_AUTH_TOKEN")
	if serviceToken == "" {
		serviceToken = "dev-internal-token"
		log.Warn("SERVICE_AUTH_TOKEN not set, using development default")
	}
	serviceHeader := os.Getenv("SERVICE_AUTH_HEADER")

	router := gin.Default()

	// Initialize OpenTelemetry tracing
	shutdownTracer, err := observability.InitTracer(context.Background(), observability.TracerConfig{
		ServiceName:    "dirsvc",
		ServiceVersion: "1.0.0",
		Environment:    envOr("ENVIRONMENT", "development"),
	}, log)
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	}
	defer shutdownTracer(context.Background())

	// Initialize and apply observability middleware
	metrics := observability.NewMetrics()
	router.Use(otelgin.Middleware("dirsvc"))
	router.Use(observability.PrometheusMiddleware(metrics))
	router.Use(observability.PrometheusMiddleware(metrics))
	router.Use(logger.RequestLogger(log))

	// Security Middleware
	router.Use(middleware.SecurityHeadersMiddleware())
	// Rate limit: 20 req/s, burst 40
	router.Use(middleware.RateLimitMiddleware(rate.Limit(20), 40))

	// Security Middleware
	router.Use(middleware.SecurityHeadersMiddleware())
	// Rate limit: 20 req/s, burst 40 (adjust as needed for bulk SCIM ops)
	router.Use(middleware.RateLimitMiddleware(rate.Limit(20), 40))

	// Register Prometheus metrics handler
	router.GET("/metrics", gin.WrapH(observability.PrometheusHandler()))

	// Register service routes
	api := directory.NewHTTPHandler(svc, log, directory.HTTPHandlerConfig{
		ServiceAuthToken:  serviceToken,
		ServiceAuthHeader: serviceHeader,
	})
	api.RegisterRoutes(router)

	// Register SCIM routes
	scimSvc := scim.NewService(svc)
	scimHandlers := scim.NewHTTPHandler(scimSvc, log)
	scimHandlers.RegisterRoutes(router)

	log.Info("HTTP server starting", zap.String("addr", ":8081"))
	if err := router.Run(":8081"); err != nil {
		log.Error("HTTP server failed", zap.Error(err))
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
