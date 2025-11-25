package auth

// LoginRequest holds the request parameters for the Login endpoint.
type LoginRequest struct {
	Username string `json:"username" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginResponse holds the response values for the Login endpoint.
type LoginResponse struct {
	Token string `json:"token"`
}

// AuthorizeRequest holds the request parameters for the Authorize endpoint.
type AuthorizeRequest struct {
	ResponseType string `json:"response_type" validate:"required"`
	ClientID     string `json:"client_id" validate:"required"`
	RedirectURI  string `json:"redirect_uri" validate:"required,url"`
	Scope        string `json:"scope" validate:"required"`
	State        string `json:"state"`
}

// AuthorizeResponse holds the response values for the Authorize endpoint.
type AuthorizeResponse struct {
	RedirectURI string `json:"redirect_uri"`
}

// TokenRequest holds the request parameters for the Token endpoint.
type TokenRequest struct {
	GrantType   string `json:"grant_type" validate:"required"`
	Code        string `json:"code" validate:"required"`
	RedirectURI string `json:"redirect_uri" validate:"required,url"`
	ClientID    string `json:"client_id" validate:"required"`
}

// TokenResponse holds the response values for the Token endpoint.
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	IDToken     string `json:"id_token,omitempty"`
}
