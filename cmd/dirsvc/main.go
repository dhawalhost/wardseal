package main

import (
	"context"
	"fmt"
	"os"
	"time"

	gokitserver "github.com/dhawalhost/gokit/server"

	gokitconfig "github.com/dhawalhost/gokit/config"
	"github.com/dhawalhost/gokit/health"
	"github.com/dhawalhost/gokit/logger"
	gokitmiddleware "github.com/dhawalhost/gokit/middleware"
	"github.com/dhawalhost/gokit/observability"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/internal/audit"
	"github.com/dhawalhost/wardseal/internal/authz"
	"github.com/dhawalhost/wardseal/internal/directory"
	"github.com/dhawalhost/wardseal/internal/rbac"
	"github.com/dhawalhost/wardseal/internal/scim"
	"github.com/dhawalhost/wardseal/pkg/config"
	"github.com/dhawalhost/wardseal/pkg/database"
	"github.com/dhawalhost/wardseal/pkg/eventbus"
	"github.com/dhawalhost/wardseal/pkg/eventbus/redisbus"
	"github.com/dhawalhost/wardseal/pkg/middleware"
	wardsealobs "github.com/dhawalhost/wardseal/pkg/observability"
	"github.com/dhawalhost/wardseal/pkg/types"
)

func main() {
	// Load centralized configuration
	cfg := config.MustLoad()

	log, err := logger.New(cfg.Observability.LogLevel, cfg.Environment == config.Development)
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = log.Sync() }()

	// Database connection
	db, err := database.NewConnection(cfg.Database.ConnectionConfig())
	if err != nil {
		log.Error("Failed to connect to database", zap.Error(err))
		os.Exit(1)
	}

	var bus eventbus.EventBus
	if cfg.Auth.RedisAddr != "" {
		redisClient := redis.NewUniversalClient(&redis.UniversalOptions{
			Addrs:    cfg.Auth.RedisAddrs(),
			Password: cfg.Auth.RedisPassword.Raw(),
			DB:       cfg.Auth.RedisDB,
		})
		if err := redisClient.Ping(context.Background()).Err(); err != nil {
			log.Warn("Redis unavailable for eventbus; events will be dropped", zap.Error(err))
		} else {
			bus = redisbus.NewRedisEventBus(redisClient, log)
		}
	} else {
		log.Warn("No Redis configured; eventbus disabled")
	}

	repo := directory.NewRepository(db)
	svc := directory.NewService(repo, bus)

	// Initialize Audit service for SCIM and administration logging
	auditRepo := audit.NewRepository(db)
	auditSvc := audit.NewService(auditRepo)

	resolvedToken, err := middleware.ResolveServiceAuthToken(string(cfg.Environment), cfg.Directory.ServiceAuthToken.Raw())
	if err != nil {
		log.Fatal("Invalid service auth configuration", zap.Error(err))
	}
	if cfg.Directory.ServiceAuthToken.IsEmpty() {
		log.Warn("SERVICE_AUTH_TOKEN not set, using development default")
	}
	serviceToken := types.NewSecret(resolvedToken)
	serviceHeader := cfg.Directory.ServiceAuthHeader

	router := gin.Default()

	// Standardized CORS configuration (Must be at the TOP for Pre-flights)
	origins := cfg.Governance.CORSAllowedOrigins
	if len(origins) == 0 {
		origins = []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID", "X-User-ID", "X-Device-ID", "X-OS-Version", "X-Tenant-Role", "Accept", "X-Requested-With", "Accept-Encoding", "Cache-Control"},
		ExposeHeaders:    []string{"Content-Length", "Access-Control-Allow-Origin", "X-Service-Auth"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Enforce CDN and proxy cache controls (prevents PII & directory identity edge cache poisoning)
	router.Use(middleware.CacheControl(gokitmiddleware.CacheControlConfig{
		Public: false,
		MaxAge: 0,
		Vary:   []string{"Origin", "Authorization", "X-Tenant-ID", "Accept-Encoding"},
	}))

	// Initialize OpenTelemetry tracing
	shutdownTracer, err := observability.InitTracer(context.Background(), gokitconfig.TelemetryConfig{
		Enabled:      cfg.Observability.OTELEndpoint != "",
		OTLPEndpoint: cfg.Observability.OTELEndpoint,
		ServiceName:  cfg.Observability.ServiceName,
	})
	if err != nil {
		log.Error("Failed to initialize tracer", zap.Error(err))
	}
	defer func() { _ = shutdownTracer(context.Background()) }()

	// Initialize and apply observability middleware
	metrics := wardsealobs.NewMetrics()
	router.Use(otelgin.Middleware("dirsvc"))
	router.Use(wardsealobs.PrometheusMiddleware(metrics))
	router.Use(middleware.Wrap(gokitmiddleware.RequestID())) // Inject tracing ID
	router.Use(middleware.Compression())                   // Multi-codec response compression (zstd, brotli, gzip)

	// Security Middleware
	router.Use(middleware.Wrap(gokitmiddleware.SecureHeaders()))
	router.Use(middleware.SecurityHeadersMiddleware())

	var rateLimitRedisClient redis.UniversalClient
	if cfg.Auth.RedisAddr != "" {
		rateLimitRedisClient = redis.NewUniversalClient(&redis.UniversalOptions{
			Addrs:    cfg.Auth.RedisAddrs(),
			Password: cfg.Auth.RedisPassword.Raw(),
			DB:       cfg.Auth.RedisDB,
		})
		if err := rateLimitRedisClient.Ping(context.Background()).Err(); err != nil {
			log.Warn("Distributed limiter Redis unavailable; will use strict degraded fallback",
				zap.Error(err),
				zap.String("redis_addr", cfg.Auth.RedisAddr))
			rateLimitRedisClient = nil
		}
	}

	router.Use(middleware.DistributedRateLimitMiddleware(middleware.DistributedRateLimitConfig{
		RedisClient: rateLimitRedisClient,
		KeyPrefix:   cfg.Auth.RateLimitKeyPrefix + ":dirsvc",
		UseTenant:   cfg.Auth.RateLimitUseTenant,
		DefaultProfile: middleware.RateLimitWindowProfile{
			Requests: cfg.Auth.RateLimitDefault.Requests,
			Window:   cfg.Auth.RateLimitDefault.Window,
		},
		EndpointProfiles: map[string]middleware.RateLimitWindowProfile{
			"login": {
				Requests: cfg.Auth.RateLimitLogin.Requests,
				Window:   cfg.Auth.RateLimitLogin.Window,
			},
			"token": {
				Requests: cfg.Auth.RateLimitToken.Requests,
				Window:   cfg.Auth.RateLimitToken.Window,
			},
			"setup": {
				Requests: cfg.Auth.RateLimitSetup.Requests,
				Window:   cfg.Auth.RateLimitSetup.Window,
			},
			"webhook": {
				Requests: cfg.Auth.RateLimitWebhook.Requests,
				Window:   cfg.Auth.RateLimitWebhook.Window,
			},
		},
		DegradedProfile: middleware.RateLimitWindowProfile{
			Requests: cfg.Auth.RateLimitDegraded.Requests,
			Window:   cfg.Auth.RateLimitDegraded.Window,
		},
	}))

	// API Logger Middleware
	router.Use(middleware.APILogger(db, log))

	// Register Prometheus metrics handler
	router.GET("/metrics", gin.WrapH(wardsealobs.PrometheusHandler()))

	// Register standardized health checks
	healthHandler := health.NewHandler()
	if db != nil {
		healthHandler.Register("database", middleware.SQLHealthChecker(db.DB))
	}
	router.GET("/healthz", gin.WrapF(healthHandler.LiveHandler()))
	router.GET("/scim/healthz", gin.WrapF(healthHandler.LiveHandler()))
	router.GET("/readyz", gin.WrapF(healthHandler.ReadyHandler()))

	rbacRepo := rbac.NewRepository(db)
	authzRepo := authz.NewRepository(db)
	authzEngine := authz.NewEngine(authzRepo, log, nil)
	rbacSvc := rbac.NewService(rbacRepo, authzEngine)

	// Register service routes
	api := directory.NewHTTPHandler(svc, log, directory.HTTPHandlerConfig{
		ServiceAuthToken:  serviceToken.Raw(),
		ServiceAuthHeader: serviceHeader,
		Perms:             rbacSvc,
	})
	api.RegisterRoutes(router)

	// Register SCIM routes
	scimSvc := scim.NewService(svc, auditSvc)
	scimHandlers := scim.NewHTTPHandler(scimSvc, repo, serviceToken.Raw(), log)
	scimHandlers.RegisterRoutes(router)

	// Start DPDP Account Erasure Background Worker
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	// Run checks daily, purging accounts that have been soft-deleted for 30 days
	directory.StartAccountErasureWorker(workerCtx, svc, log, 24*time.Hour, 30*24*time.Hour)

	// Server Configuration with Graceful Shutdown using gokit/server
	listenAddr := config.ResolvePort(":8081", "DIRSVC_PORT")
	srv := gokitserver.New(
		gokitserver.WithAddr(listenAddr),
		gokitserver.WithReadTimeout(30*time.Second),
		gokitserver.WithWriteTimeout(30*time.Second),
		gokitserver.WithIdleTimeout(120*time.Second),
		gokitserver.WithShutdownTimeout(30*time.Second),
	)
	srv.Mount("/", router)

	log.Info("Directory service starting", zap.String("addr", listenAddr))
	if err := srv.Run(context.Background()); err != nil {
		log.Error("Directory service terminated with error", zap.Error(err))
	}
	workerCancel() // Cancel background worker upon graceful HTTP shutdown
	log.Info("Directory service exited gracefully")
}
