package middleware

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/dhawalhost/gokit/bulkhead"
	"github.com/dhawalhost/gokit/compression"
	gokiterrors "github.com/dhawalhost/gokit/errors"
	"github.com/dhawalhost/gokit/health"
	gokitidempotency "github.com/dhawalhost/gokit/idempotency"
	"github.com/dhawalhost/gokit/loadshed"
	gokitmiddleware "github.com/dhawalhost/gokit/middleware"
	gokitpagination "github.com/dhawalhost/gokit/pagination"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ginWriterAdapter struct {
	gin.ResponseWriter
	wrapped http.ResponseWriter
}

func (a *ginWriterAdapter) Header() http.Header {
	return a.wrapped.Header()
}

func (a *ginWriterAdapter) Write(b []byte) (int, error) {
	return a.wrapped.Write(b)
}

func (a *ginWriterAdapter) WriteHeader(code int) {
	a.ResponseWriter.WriteHeader(code)
	a.wrapped.WriteHeader(code)
}

func (a *ginWriterAdapter) WriteString(s string) (int, error) {
	return a.wrapped.Write([]byte(s))
}

// Wrap returns a Gin middleware that wraps a standard net/http middleware.
func Wrap(middleware func(http.Handler) http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		origWriter := c.Writer
		var nextCalled bool
		nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			c.Request = r
			c.Writer = &ginWriterAdapter{
				ResponseWriter: origWriter,
				wrapped:        w,
			}
			c.Next()
		})

		wrappedHandler := middleware(nextHandler)
		wrappedHandler.ServeHTTP(c.Writer, c.Request)
		c.Writer = origWriter
		if !nextCalled {
			c.Abort()
		}
	}
}

// CacheControl adapts gokit/middleware.CacheControl to Gin.
func CacheControl(cfg gokitmiddleware.CacheControlConfig) gin.HandlerFunc {
	return Wrap(gokitmiddleware.CacheControl(cfg))
}

// SecureHeaders adapts gokit/middleware.SecureHeaders (OWASP) to Gin.
func SecureHeaders() gin.HandlerFunc {
	return Wrap(gokitmiddleware.SecureHeaders())
}

// RequestID adapts gokit/middleware.RequestID to Gin.
func RequestID() gin.HandlerFunc {
	return Wrap(gokitmiddleware.RequestID())
}

// Compression adapts gokit/compression.Middleware to Gin.
// Supports Zstandard (zstd), Brotli (br), Gzip, and Deflate with sync.Pool buffer recycling.
func Compression(opts ...compression.Option) gin.HandlerFunc {
	return Wrap(compression.Middleware(opts...))
}

// AbortWithAppError aborts the current Gin context and writes a standardized JSON error
// using gokit/errors.WriteError.
func AbortWithAppError(c *gin.Context, err error) {
	c.Abort()
	gokiterrors.WriteError(c.Writer, c.Request, err)
}

// WriteAppError writes a standardized JSON error using gokit/errors.WriteError without aborting.
func WriteAppError(c *gin.Context, err error) {
	gokiterrors.WriteError(c.Writer, c.Request, err)
}

// Idempotency adapts gokit/idempotency.Middleware to Gin.
func Idempotency(cfg ...gokitidempotency.Config) gin.HandlerFunc {
	var c gokitidempotency.Config
	if len(cfg) > 0 {
		c = cfg[0]
	}
	return Wrap(gokitidempotency.Middleware(c))
}

// LoadShed adapts gokit/loadshed.Middleware to Gin for adaptive latency-based load shedding.
func LoadShed(limiter *loadshed.Limiter, opts ...loadshed.MiddlewareOption) gin.HandlerFunc {
	return Wrap(loadshed.Middleware(limiter, opts...))
}

// Bulkhead adapts gokit/bulkhead.Middleware to Gin for per-partition (e.g. per-tenant) concurrency limiting.
func Bulkhead(pb *bulkhead.PartitionedBulkhead, keyFunc bulkhead.KeyFunc) gin.HandlerFunc {
	return Wrap(bulkhead.Middleware(pb, keyFunc))
}

// ParsePagination extracts pagination parameters (limit, offset, cursor) using
// gokit/pagination.ParseCursorParams and gokit/pagination.ParseOffsetParams,
// providing unified pagination handling across list endpoints.
func ParsePagination(r *http.Request) (limit int, offset int, cursor string) {
	cursorParams := gokitpagination.ParseCursorParams(r)
	offsetParams := gokitpagination.ParseOffsetParams(r)

	limit = cursorParams.Limit
	cursor = cursorParams.Cursor

	// Calculate offset from page/page_size if present
	offset = (offsetParams.Page - 1) * offsetParams.PageSize

	// If explicit offset is passed in query, prioritize it
	if offStr := r.URL.Query().Get("offset"); offStr != "" {
		if n, err := strconv.Atoi(offStr); err == nil && n >= 0 {
			offset = n
		}
	}

	return limit, offset, cursor
}

// HealthCheckerFunc adapts a func(ctx context.Context) error to health.Checker.
type HealthCheckerFunc func(ctx context.Context) error

// HealthCheck executes the underlying health check function.
func (f HealthCheckerFunc) HealthCheck(ctx context.Context) error {
	return f(ctx)
}

// GORMHealthChecker creates a health.Checker for a GORM database.
func GORMHealthChecker(db *gorm.DB) health.Checker {
	return HealthCheckerFunc(func(ctx context.Context) error {
		if db == nil {
			return errors.New("gorm: db is nil")
		}
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.PingContext(ctx)
	})
}

// SQLHealthChecker creates a health.Checker for a standard *sql.DB.
func SQLHealthChecker(db *sql.DB) health.Checker {
	return HealthCheckerFunc(func(ctx context.Context) error {
		if db == nil {
			return errors.New("sql: db is nil")
		}
		return db.PingContext(ctx)
	})
}
