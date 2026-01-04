package logger

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// CorrelationIDKey is the context key for correlation IDs.
const CorrelationIDKey = "correlation_id"

// New returns a new Zap logger with production configuration.
func New(level zapcore.Level) *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.Level.SetLevel(level)

	logger, _ := config.Build()
	return logger
}

// NewFromEnv creates a logger with level based on LOG_LEVEL environment variable.
// Defaults to Info level if not set or invalid.
func NewFromEnv() *zap.Logger {
	levelStr := os.Getenv("LOG_LEVEL")
	level := zapcore.InfoLevel

	switch levelStr {
	case "debug", "DEBUG":
		level = zapcore.DebugLevel
	case "info", "INFO":
		level = zapcore.InfoLevel
	case "warn", "WARN":
		level = zapcore.WarnLevel
	case "error", "ERROR":
		level = zapcore.ErrorLevel
	}

	return New(level)
}

// RequestLogger returns a Gin middleware that logs HTTP requests.
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Get or generate correlation ID
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = c.GetHeader("X-Request-ID")
		}
		if correlationID != "" {
			c.Set(CorrelationIDKey, correlationID)
		}

		// Process request
		c.Next()

		// Log after request
		latency := time.Since(start)
		status := c.Writer.Status()

		fields := []zap.Field{
			zap.Int("status", status),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.Duration("latency", latency),
			zap.String("client_ip", c.ClientIP()),
			zap.Int("body_size", c.Writer.Size()),
		}

		if correlationID != "" {
			fields = append(fields, zap.String("correlation_id", correlationID))
		}

		if tenantID, exists := c.Get("tenantID"); exists {
			fields = append(fields, zap.Any("tenant_id", tenantID))
		}

		if status >= 500 {
			logger.Error("Request completed with server error", fields...)
		} else if status >= 400 {
			logger.Warn("Request completed with client error", fields...)
		} else {
			logger.Info("Request completed", fields...)
		}
	}
}
