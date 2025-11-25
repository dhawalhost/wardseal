package directory

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

func tenantIDToContext(ctx context.Context, r *http.Request) context.Context {
	// In a real application, the tenant ID would be extracted from a JWT token
	// or from the hostname.
	return context.WithValue(ctx, TenantIDContextKey, "dummy-tenant-id")
}

// NewHTTPHandler returns an HTTP handler that makes a set of endpoints available
// on predefined paths.
func NewHTTPHandler(endpoints Endpoints, logger *slog.Logger) http.Handler {
	r := mux.NewRouter()
	options := []httptransport.ServerOption{
		httptransport.ServerErrorEncoder(encodeError),
		httptransport.ServerErrorHandler(newSlogErrorHandler(logger)),
		httptransport.ServerBefore(tenantIDToContext),
	}

	r.Methods("GET").Path("/health").Handler(httptransport.NewServer(
		endpoints.HealthCheckEndpoint,
		decodeHealthCheckRequest,
		encodeResponse,
		options...,
	))

	// User routes
	r.Methods("POST").Path("/users").Handler(httptransport.NewServer(
		endpoints.CreateUserEndpoint,
		decodeCreateUserRequest,
		encodeResponse,
		options...,
	))

	r.Methods("GET").Path("/users/{id}").Handler(httptransport.NewServer(
		endpoints.GetUserByIDEndpoint,
		decodeGetUserByIDRequest,
		encodeResponse,
		options...,
	))

	r.Methods("GET").Path("/users").Handler(httptransport.NewServer(
		endpoints.GetUserByEmailEndpoint,
		decodeGetUserByEmailRequest,
		encodeResponse,
		options...,
	)).Queries("email", "{email}")

	r.Methods("PUT").Path("/users/{id}").Handler(httptransport.NewServer(
		endpoints.UpdateUserEndpoint,
		decodeUpdateUserRequest,
		encodeResponse,
		options...,
	))

	r.Methods("DELETE").Path("/users/{id}").Handler(httptransport.NewServer(
		endpoints.DeleteUserEndpoint,
		decodeDeleteUserRequest,
		encodeResponse,
		options...,
	))

	// Group routes
	r.Methods("POST").Path("/groups").Handler(httptransport.NewServer(
		endpoints.CreateGroupEndpoint,
		decodeCreateGroupRequest,
		encodeResponse,
		options...,
	))

	r.Methods("GET").Path("/groups/{id}").Handler(httptransport.NewServer(
		endpoints.GetGroupByIDEndpoint,
		decodeGetGroupByIDRequest,
		encodeResponse,
		options...,
	))

	r.Methods("PUT").Path("/groups/{id}").Handler(httptransport.NewServer(
		endpoints.UpdateGroupEndpoint,
		decodeUpdateGroupRequest,
		encodeResponse,
		options...,
	))

	r.Methods("DELETE").Path("/groups/{id}").Handler(httptransport.NewServer(
		endpoints.DeleteGroupEndpoint,
		decodeDeleteGroupRequest,
		encodeResponse,
		options...,
	))

	// Group membership routes
	r.Methods("POST").Path("/groups/{id}/users").Handler(httptransport.NewServer(
		endpoints.AddUserToGroupEndpoint,
		decodeAddUserToGroupRequest,
		encodeResponse,
		options...,
	))

	r.Methods("DELETE").Path("/groups/{id}/users/{userID}").Handler(httptransport.NewServer(
		endpoints.RemoveUserFromGroupEndpoint,
		decodeRemoveUserFromGroupRequest,
		encodeResponse,
		options...,
	))

	return r
}

func decodeHealthCheckRequest(_ context.Context, r *http.Request) (interface{}, error) {
	return nil, nil // No request payload
}

// User request/response decoders
func decodeCreateUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeGetUserByIDRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	return GetUserByIDRequest{ID: id}, nil
}

func decodeGetUserByEmailRequest(_ context.Context, r *http.Request) (interface{}, error) {
	email := r.URL.Query().Get("email")
	if email == "" {
		return nil, ErrBadRouting
	}
	return GetUserByEmailRequest{Email: email}, nil
}

func decodeUpdateUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		return nil, err
	}
	return UpdateUserRequest{ID: id, User: user}, nil
}

func decodeDeleteUserRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	return DeleteUserRequest{ID: id}, nil
}

// Group request/response decoders
func decodeCreateGroupRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeGetGroupByIDRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	return GetGroupByIDRequest{ID: id}, nil
}

func decodeUpdateGroupRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	var group Group
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		return nil, err
	}
	return UpdateGroupRequest{ID: id, Group: group}, nil
}

func decodeDeleteGroupRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	return DeleteGroupRequest{ID: id}, nil
}

// Group membership request/response decoders
func decodeAddUserToGroupRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	var req AddUserToGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.GroupID = id
	return req, nil
}

func decodeRemoveUserFromGroupRequest(_ context.Context, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return nil, ErrBadRouting
	}
	userID, ok := vars["userID"]
	if !ok {
		return nil, ErrBadRouting
	}
	return RemoveUserFromGroupRequest{GroupID: id, UserID: userID}, nil
}

func encodeResponse(ctx context.Context, w http.ResponseWriter, response interface{}) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// Check the response type to set the correct status code.
	switch response.(type) {
	case CreateUserResponse, CreateGroupResponse:
		w.WriteHeader(http.StatusCreated)
	default:
		w.WriteHeader(http.StatusOK)
	}
	return json.NewEncoder(w).Encode(response)
}

func encodeError(_ context.Context, err error, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": err.Error(),
	})
}

// ErrBadRouting is returned when an expected path parameter is missing.
var ErrBadRouting = &Error{"bad_routing", "inconsistent mapping between route and handler"}

// Error represents a service-specific error.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string {
	return e.Message
}