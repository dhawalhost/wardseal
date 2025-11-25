package middleware

import (
	"github.com/dhawalhost/velverify/pkg/observability"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
)

// Metrics is a middleware that records Prometheus metrics for HTTP requests.
func Metrics(metrics *observability.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			route := mux.CurrentRoute(r)
			path, _ := route.GetPathTemplate()

			// Instrument the request
			defer func() {
				duration := time.Since(start)
				metrics.RequestsTotal.With(prometheus.Labels{"method": r.Method, "path": path}).Inc()
				metrics.RequestDuration.With(prometheus.Labels{"method": r.Method, "path": path}).Observe(duration.Seconds())
			}()

			next.ServeHTTP(w, r)
		})
	}
}
