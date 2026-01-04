package auth

// SocialLoginRequest represents the payload for social login.
type SocialLoginRequest struct {
	Provider    string `json:"provider" binding:"required"`
	Code        string `json:"code"`     // For auth code flow
	IDToken     string `json:"id_token"` // For implicit/mobile
	RedirectURI string `json:"redirect_uri"`

	// For MVP Simulation (Internal Use Only / Dev Mode)
	Email      string `json:"email"`
	ExternalID string `json:"external_id"`
}
