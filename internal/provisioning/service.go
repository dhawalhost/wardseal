package provisioning

import "context"

// Service defines the interface for the provisioning service.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)
}

type provisioningService struct{}

// NewService creates a new provisioning service.
func NewService() Service {
	return &provisioningService{}
}

func (s *provisioningService) HealthCheck(ctx context.Context) (bool, error) {
	return true, nil
}
