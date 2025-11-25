package policy

// HealthCheckResponse holds the response values for the HealthCheck endpoint.
type HealthCheckResponse struct {
	Healthy bool `json:"healthy"`
}
