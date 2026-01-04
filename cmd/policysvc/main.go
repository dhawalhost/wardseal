package main

import (
	"os"

	"github.com/dhawalhost/wardseal/internal/policy"
	"github.com/dhawalhost/wardseal/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log := logger.New(zapcore.DebugLevel)
	defer log.Sync()

	svc := policy.NewService()

	router := gin.Default()
	policyHandlers := policy.NewHTTPHandler(svc, log)
	policyHandlers.RegisterRoutes(router)

	log.Info("Policy service starting", zap.String("addr", ":8083"))
	if err := router.Run(":8083"); err != nil {
		log.Error("Policy service failed", zap.Error(err))
		os.Exit(1)
	}
}
