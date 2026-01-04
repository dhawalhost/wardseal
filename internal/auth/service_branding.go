package auth

import "context"

func (s *authService) GetBranding(ctx context.Context, tenantID string) (BrandingConfig, error) {
	if s.brandingStore == nil {
		// Fallback for when store is not initialized (e.g. tests)
		return BrandingConfig{TenantID: tenantID}, nil
	}
	return s.brandingStore.Get(ctx, tenantID)
}

func (s *authService) UpdateBranding(ctx context.Context, config BrandingConfig) error {
	if s.brandingStore == nil {
		return nil
	}
	return s.brandingStore.Upsert(ctx, config)
}
