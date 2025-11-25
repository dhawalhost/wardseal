package main

import (
	"os"

	"github.com/dhawalhost/velverify/internal/auth"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/dhawalhost/velverify/pkg/observability"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log := logger.New(zapcore.DebugLevel)
	defer log.Sync()

	directoryServiceURL := os.Getenv("DIRECTORY_SERVICE_URL")
	if directoryServiceURL == "" {
		directoryServiceURL = "http://dirsvc:8081" // Use service name in docker-compose
	}

	svc, err := auth.NewService(directoryServiceURL)
	if err != nil {
		log.Error("Failed to create auth service", zap.Error(err))
		os.Exit(1)
	}

	router := gin.Default()

	// Initialize and apply Prometheus middleware
	metrics := observability.NewMetrics()
	router.Use(observability.PrometheusMiddleware(metrics))

	authHandlers := auth.NewHTTPHandler(svc, log)
	authHandlers.RegisterRoutes(router)

	// Register Prometheus metrics handler
	router.GET("/metrics", gin.WrapH(observability.PrometheusHandler()))

	log.Info("Auth service starting", zap.String("addr", ":8080"))
	if err := router.Run(":8080"); err != nil {
		log.Error("Auth service failed", zap.Error(err))
		os.Exit(1)
	}
}
