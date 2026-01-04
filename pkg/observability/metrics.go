package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// NewMetrics returns a new set of Prometheus metrics.
func NewMetrics() *Metrics {
	m := &Metrics{
		RequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests.",
			},
			[]string{"code", "method", "path"},
		),
		RequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "Histogram of latencies for HTTP requests.",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"code", "method", "path"},
		),
		TokensIssued: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "auth_tokens_issued_total",
				Help: "Total number of tokens issued.",
			},
			[]string{"grant_type", "tenant_id"},
		),
		TokenErrors: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "auth_token_errors_total",
				Help: "Total number of token issuance errors.",
			},
			[]string{"error_type", "grant_type"},
		),
		TokenIntrospections: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "auth_token_introspections_total",
				Help: "Total number of token introspection requests.",
			},
			[]string{"active", "token_type"},
		),
		TokenRevocations: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "auth_token_revocations_total",
				Help: "Total number of token revocation requests.",
			},
		),
	}
	prometheus.MustRegister(m.RequestsTotal)
	prometheus.MustRegister(m.RequestDuration)
	prometheus.MustRegister(m.TokensIssued)
	prometheus.MustRegister(m.TokenErrors)
	prometheus.MustRegister(m.TokenIntrospections)
	prometheus.MustRegister(m.TokenRevocations)
	return m
}

// Metrics holds the Prometheus metrics.
type Metrics struct {
	RequestsTotal       *prometheus.CounterVec
	RequestDuration     *prometheus.HistogramVec
	TokensIssued        *prometheus.CounterVec
	TokenErrors         *prometheus.CounterVec
	TokenIntrospections *prometheus.CounterVec
	TokenRevocations    prometheus.Counter
}

// RecordTokenIssued records a successful token issuance.
func (m *Metrics) RecordTokenIssued(grantType, tenantID string) {
	m.TokensIssued.WithLabelValues(grantType, tenantID).Inc()
}

// RecordTokenError records a token issuance error.
func (m *Metrics) RecordTokenError(errorType, grantType string) {
	m.TokenErrors.WithLabelValues(errorType, grantType).Inc()
}

// RecordTokenIntrospection records a token introspection.
func (m *Metrics) RecordTokenIntrospection(active bool, tokenType string) {
	activeStr := "false"
	if active {
		activeStr = "true"
	}
	m.TokenIntrospections.WithLabelValues(activeStr, tokenType).Inc()
}

// RecordTokenRevocation records a token revocation.
func (m *Metrics) RecordTokenRevocation() {
	m.TokenRevocations.Inc()
}

// PrometheusMiddleware returns a Gin middleware that records Prometheus metrics for HTTP requests.
func PrometheusMiddleware(metrics *Metrics) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next() // Process request

		statusCode := strconv.Itoa(c.Writer.Status())
		path := c.Request.URL.Path
		method := c.Request.Method

		metrics.RequestsTotal.WithLabelValues(statusCode, method, path).Inc()
		metrics.RequestDuration.WithLabelValues(statusCode, method, path).Observe(time.Since(start).Seconds())
	}
}

// PrometheusHandler returns an http.Handler for the Prometheus metrics.
func PrometheusHandler() http.Handler {
	return promhttp.Handler()
}
