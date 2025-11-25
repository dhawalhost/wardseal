package main

import (
	"os"

	"github.com/dhawalhost/velverify/internal/governance"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log := logger.New(zapcore.DebugLevel)
	defer log.Sync()

	svc := governance.NewService()

	router := gin.Default()
	govHandlers := governance.NewHTTPHandler(svc, log)
	govHandlers.RegisterRoutes(router)

	log.Info("Governance service starting", zap.String("addr", ":8082"))
	if err := router.Run(":8082"); err != nil {
		log.Error("Governance service failed", zap.Error(err))
		os.Exit(1)
	}
}
