package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/dhawalhost/velverify/internal/directory"
	"github.com/dhawalhost/velverify/pkg/database"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/dhawalhost/velverify/pkg/observability"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // postgres driver
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log := logger.New(zapcore.DebugLevel)
	defer log.Sync()

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	// Database connection
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		dbHost, 5432, "user", "password", "identity_platform", "disable")

	db, err := database.NewConnection(psqlInfo)
	if err != nil {
		log.Error("Failed to connect to database", zap.Error(err))
		os.Exit(1)
	}

	svc := directory.NewService(db)

	router := gin.Default()

	// Initialize and apply Prometheus middleware
	metrics := observability.NewMetrics()
	router.Use(observability.PrometheusMiddleware(metrics))

	// Register Prometheus metrics handler
	router.GET("/metrics", gin.WrapH(observability.PrometheusHandler()))

	// Temporary placeholder for registering routes, will be replaced with proper API layer
	router.GET("/health", func(c *gin.Context) {
		ok, err := svc.HealthCheck(c.Request.Context())
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"healthy": ok})
	})

	log.Info("HTTP server starting", zap.String("addr", ":8081"))
	if err := router.Run(":8081"); err != nil {
		log.Error("HTTP server failed", zap.Error(err))
		os.Exit(1)
	}
}
