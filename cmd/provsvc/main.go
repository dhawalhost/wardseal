package main

import (
	"os"

	"github.com/dhawalhost/wardseal/internal/provisioning"
	"github.com/dhawalhost/wardseal/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log := logger.New(zapcore.DebugLevel)
	defer log.Sync()

	svc := provisioning.NewService()

	router := gin.Default()
	provHandlers := provisioning.NewHTTPHandler(svc, log)
	provHandlers.RegisterRoutes(router)

	log.Info("Provisioning service starting", zap.String("addr", ":8084"))
	if err := router.Run(":8084"); err != nil {
		log.Error("Provisioning service failed", zap.Error(err))
		os.Exit(1)
	}
}
