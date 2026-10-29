package main

import (
	"fmt"
	"os"
	"time"

	"github.com/dhawalhost/gokit/health"
	"github.com/dhawalhost/gokit/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/internal/policy"
	"github.com/dhawalhost/wardseal/pkg/config"
	"github.com/dhawalhost/wardseal/pkg/database"
	"github.com/dhawalhost/wardseal/pkg/middleware"
)

func main() {
	cfg := config.MustLoad()

	log, err := logger.New(cfg.Observability.LogLevel, cfg.Environment == config.Development)
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = log.Sync() }()

	dbConfig := database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password.Raw(),
		DBName:   cfg.Database.Name,
		SSLMode:  cfg.Database.SSLMode,
	}

	db, err := database.NewConnection(dbConfig)
	if err != nil {
		log.Error("Failed to connect to database", zap.Error(err))
		os.Exit(1)
	}

	repo := policy.NewRepository(db)
	engine := policy.NewSimpleEngine(repo)
	svc := policy.NewService(repo, engine)

	router := gin.Default()

	origins := cfg.Governance.CORSAllowedOrigins
	if len(origins) == 0 {
		origins = []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID", "X-User-ID", "X-Device-ID", "X-OS-Version", "Accept", "X-Requested-With", "Accept-Encoding", "Cache-Control"},
		ExposeHeaders:    []string{"Content-Length", "Access-Control-Allow-Origin"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	router.Use(middleware.Compression())
	router.Use(middleware.SoftwareWAFMiddleware())

	if cfg.Auth.JWTPublicKeyPath == "" {
		log.Fatal("JWT public key path is required for policysvc")
	}
	keyBytes, err := os.ReadFile(cfg.Auth.JWTPublicKeyPath) //nolint:gosec // G304: path from trusted config
	if err != nil {
		log.Fatal("Failed to read JWT public key file", zap.Error(err))
	}
	pubKey, err := jwt.ParseRSAPublicKeyFromPEM(keyBytes)
	if err != nil {
		log.Fatal("Failed to parse JWT public key", zap.Error(err))
	}

	tokenValidator := func(tokenString string) (*middleware.Claims, error) {
		token, err := jwt.ParseWithClaims(tokenString, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return pubKey, nil
		})
		if err != nil {
			return nil, err
		}
		if claims, ok := token.Claims.(*middleware.Claims); ok && token.Valid {
			return claims, nil
		}
		return nil, fmt.Errorf("invalid token")
	}

	policyHandlers := policy.NewHTTPHandler(svc, log)
	router.GET("/health", policyHandlers.HealthCheck)
	router.GET("/healthz", gin.WrapF(health.NewHandler().LiveHandler()))
	router.GET("/policy/healthz", gin.WrapF(health.NewHandler().LiveHandler()))

	apiGroup := router.Group("/api/v1")
	apiGroup.Use(middleware.TenantExtractor(middleware.TenantConfig{}))
	apiGroup.Use(middleware.RequireUserAuth(tokenValidator))
	policyHandlers.RegisterAPIRoutes(apiGroup)

	log.Info("Policy service starting", zap.String("addr", ":8083"))
	if err := router.Run(":8083"); err != nil {
		log.Error("Policy service failed", zap.Error(err))
		os.Exit(1)
	}
}
