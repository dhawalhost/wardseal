package auth

import (
	"context"

	"github.com/go-kit/kit/endpoint"
)

// Endpoints holds all Go kit endpoints for the auth service.
type Endpoints struct {
	LoginEndpoint     endpoint.Endpoint
	AuthorizeEndpoint endpoint.Endpoint
	TokenEndpoint     endpoint.Endpoint
}

// MakeEndpoints creates the endpoints for the auth service.
func MakeEndpoints(s Service) Endpoints {
	return Endpoints{
		LoginEndpoint:     makeLoginEndpoint(s),
		AuthorizeEndpoint: makeAuthorizeEndpoint(s),
		TokenEndpoint:     makeTokenEndpoint(s),
	}
}

func makeLoginEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(LoginRequest)
		token, err := s.Login(ctx, req.Username, req.Password)
		if err != nil {
			return nil, err
		}
		return LoginResponse{Token: token}, nil
	}
}

func makeAuthorizeEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(AuthorizeRequest)
		resp, err := s.Authorize(ctx, req)
		if err != nil {
			return nil, err
		}
		return resp, nil
	}
}

func makeTokenEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(TokenRequest)
		resp, err := s.Token(ctx, req)
		if err != nil {
			return nil, err
		}
		return resp, nil
	}
}

// LoginRequest holds the request parameters for the Login endpoint.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse holds the response values for the Login endpoint.
type LoginResponse struct {
	Token string `json:"token"`
}

// AuthorizeRequest holds the request parameters for the Authorize endpoint.
type AuthorizeRequest struct {
	ResponseType string `json:"response_type"`
	ClientID     string `json:"client_id"`
	RedirectURI  string `json:"redirect_uri"`
	Scope        string `json:"scope"`
	State        string `json:"state"`
}

// AuthorizeResponse holds the response values for the Authorize endpoint.
type AuthorizeResponse struct {
	RedirectURI string `json:"redirect_uri"`
}

// TokenRequest holds the request parameters for the Token endpoint.
type TokenRequest struct {
	GrantType   string `json:"grant_type"`
	Code        string `json:"code"`
	RedirectURI string `json:"redirect_uri"`
	ClientID    string `json:"client_id"`
}

// TokenResponse holds the response values for the Token endpoint.
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	IDToken     string `json:"id_token,omitempty"`
}