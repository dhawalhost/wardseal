package auth

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-kit/kit/transport"
	httptransport "github.com/go-kit/kit/transport/http"
	"github.com/gorilla/mux"
)

// slogErrorHandler implements the go-kit transport.ErrorHandler interface using slog.
type slogErrorHandler struct {
	logger *slog.Logger
}

// Handle logs the error using the provided slog.Logger.
func (h *slogErrorHandler) Handle(ctx context.Context, err error) {
	h.logger.ErrorContext(ctx, "transport error", "err", err)
}

// newSlogErrorHandler returns a new transport.ErrorHandler that logs errors using slog.
func newSlogErrorHandler(logger *slog.Logger) transport.ErrorHandler {
	return &slogErrorHandler{logger}
}

// NewHTTPHandler returns an HTTP handler that makes a set of endpoints available
// on predefined paths.
func NewHTTPHandler(endpoints Endpoints, s Service, logger *slog.Logger) http.Handler {
	r := mux.NewRouter()
	options := []httptransport.ServerOption{
		httptransport.ServerErrorEncoder(encodeError),
		httptransport.ServerErrorHandler(newSlogErrorHandler(logger)),
	}

	r.Methods("POST").Path("/login").Handler(httptransport.NewServer(
		endpoints.LoginEndpoint,
		decodeLoginRequest,
		encodeResponse,
		options...,
	))

	r.Methods("GET").Path("/oauth2/authorize").Handler(httptransport.NewServer(
		endpoints.AuthorizeEndpoint,
		decodeAuthorizeRequest,
		encodeAuthorizeResponse,
		options...,
	))

	r.Methods("POST").Path("/oauth2/token").Handler(httptransport.NewServer(
		endpoints.TokenEndpoint,
		decodeTokenRequest,
		encodeResponse,
		options...,
	))

	// Add the JWKS endpoint
	r.Methods("GET").Path("/.well-known/jwks.json").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if authSvc, ok := s.(*authService); ok {
			json.NewEncoder(w).Encode(authSvc.JWKS())
		} else {
			encodeError(r.Context(), &Error{"internal_error", "could not cast service"}, w)
		}
	}))

	return r
}

func decodeLoginRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeAuthorizeRequest(_ context.Context, r *http.Request) (interface{}, error) {
	q := r.URL.Query()
	req := AuthorizeRequest{
		ResponseType: q.Get("response_type"),
		ClientID:     q.Get("client_id"),
		RedirectURI:  q.Get("redirect_uri"),
		Scope:        q.Get("scope"),
		State:        q.Get("state"),
	}
	return req, nil
}

func decodeTokenRequest(_ context.Context, r *http.Request) (interface{}, error) {
	if err := r.ParseForm(); err != nil {
		return nil, err
	}
	req := TokenRequest{
		GrantType:   r.Form.Get("grant_type"),
		Code:        r.Form.Get("code"),
		RedirectURI: r.Form.Get("redirect_uri"),
		ClientID:    r.Form.Get("client_id"),
	}
	return req, nil
}

func encodeResponse(ctx context.Context, w http.ResponseWriter, response interface{}) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	return json.NewEncoder(w).Encode(response)
}

func encodeAuthorizeResponse(ctx context.Context, w http.ResponseWriter, response interface{}) error {
	resp := response.(AuthorizeResponse)
	http.Redirect(w, nil, resp.RedirectURI, http.StatusFound)
	return nil
}

func encodeError(_ context.Context, err error, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusInternalServerError) // Default status code

	// Check for specific error types and set appropriate status codes
	if e, ok := err.(*Error); ok {
		if e == ErrInvalidCredentials {
			w.WriteHeader(http.StatusUnauthorized)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": err.Error(),
	})
}
