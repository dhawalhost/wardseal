package middleware

import (
	"net/http"

	gokiterrors "github.com/dhawalhost/gokit/errors"
	gokitmiddleware "github.com/dhawalhost/gokit/middleware"
	"github.com/gin-gonic/gin"
)

// Wrap returns a Gin middleware that wraps a standard net/http middleware.
func Wrap(middleware func(http.Handler) http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Define an http.Handler that merely calls the next Gin handler.
		nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Update the Gin context strictly with the new request, in case the middleware modified it.
			c.Request = r
			c.Next()
		})

		// Apply the middleware
		wrappedHandler := middleware(nextHandler)

		// Execute the wrapped handler
		wrappedHandler.ServeHTTP(c.Writer, c.Request)
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

