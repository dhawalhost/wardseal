package policy

import "context"

// Service defines the interface for the policy service.
type Service interface {
	HealthCheck(ctx context.Context) (bool, error)
}

type policyService struct{}

// NewService creates a new policy service.
func NewService() Service {
	return &policyService{}
}

func (s *policyService) HealthCheck(ctx context.Context) (bool, error) {
	return true, nil
}
