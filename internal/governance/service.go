package governance

import "context"

// Service defines the interface for the governance service.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)
}

type governanceService struct{}

// NewService creates a new governance service.
func NewService() Service {
	return &governanceService{}
}

func (s *governanceService) HealthCheck(ctx context.Context) (bool, error) {
	return true, nil
}
