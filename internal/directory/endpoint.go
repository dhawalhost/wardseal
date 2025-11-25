package directory

import (
	"context"

	"github.com/go-kit/kit/endpoint"
)

type contextKey string

const TenantIDContextKey contextKey = "tenantID"

// Endpoints holds all Go kit endpoints for the directory service.
type Endpoints struct {
	HealthCheckEndpoint endpoint.Endpoint

	// User endpoints
	CreateUserEndpoint     endpoint.Endpoint
	GetUserByIDEndpoint    endpoint.Endpoint
	GetUserByEmailEndpoint endpoint.Endpoint
	UpdateUserEndpoint     endpoint.Endpoint
	DeleteUserEndpoint     endpoint.Endpoint

	// Group endpoints
	CreateGroupEndpoint   endpoint.Endpoint
	GetGroupByIDEndpoint  endpoint.Endpoint
	UpdateGroupEndpoint   endpoint.Endpoint
	DeleteGroupEndpoint   endpoint.Endpoint

	// Group membership endpoints
	AddUserToGroupEndpoint      endpoint.Endpoint
	RemoveUserFromGroupEndpoint endpoint.Endpoint
}

// MakeEndpoints creates the endpoints for the directory service.
func MakeEndpoints(s Service) Endpoints {
	return Endpoints{
		HealthCheckEndpoint:         makeHealthCheckEndpoint(s),
		CreateUserEndpoint:          makeCreateUserEndpoint(s),
		GetUserByIDEndpoint:       makeGetUserByIDEndpoint(s),
		GetUserByEmailEndpoint:      makeGetUserByEmailEndpoint(s),
		UpdateUserEndpoint:          makeUpdateUserEndpoint(s),
		DeleteUserEndpoint:          makeDeleteUserEndpoint(s),
		CreateGroupEndpoint:         makeCreateGroupEndpoint(s),
		GetGroupByIDEndpoint:        makeGetGroupByIDEndpoint(s),
		UpdateGroupEndpoint:         makeUpdateGroupEndpoint(s),
		DeleteGroupEndpoint:         makeDeleteGroupEndpoint(s),
		AddUserToGroupEndpoint:      makeAddUserToGroupEndpoint(s),
		RemoveUserFromGroupEndpoint: makeRemoveUserFromGroupEndpoint(s),
	}
}

func makeHealthCheckEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		ok, err := s.HealthCheck(ctx)
		return HealthCheckResponse{Healthy: ok}, err
	}
}

func makeCreateUserEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(CreateUserRequest)
		userID, err := s.CreateUser(ctx, tenantID, User{Email: req.Email, Password: req.Password})
		if err != nil {
			return nil, err
		}
		return CreateUserResponse{UserID: userID}, nil
	}
}

func makeGetUserByEmailEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(GetUserByEmailRequest)
		user, err := s.GetUserByEmail(ctx, tenantID, req.Email)
		if err != nil {
			return nil, err
		}
		return GetUserByEmailResponse{User: user}, nil
	}
}

func makeGetUserByIDEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(GetUserByIDRequest)
		user, err := s.GetUserByID(ctx, tenantID, req.ID)
		if err != nil {
			return nil, err
		}
		return GetUserByIDResponse{User: user}, nil
	}
}

func makeUpdateUserEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(UpdateUserRequest)
		err := s.UpdateUser(ctx, tenantID, req.ID, req.User)
		if err != nil {
			return nil, err
		}
		return UpdateUserResponse{}, nil
	}
}

func makeDeleteUserEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(DeleteUserRequest)
		err := s.DeleteUser(ctx, tenantID, req.ID)
		if err != nil {
			return nil, err
		}
		return DeleteUserResponse{}, nil
	}
}

func makeCreateGroupEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(CreateGroupRequest)
		groupID, err := s.CreateGroup(ctx, tenantID, req.Group)
		if err != nil {
			return nil, err
		}
		return CreateGroupResponse{GroupID: groupID}, nil
	}
}

func makeGetGroupByIDEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(GetGroupByIDRequest)
		group, err := s.GetGroupByID(ctx, tenantID, req.ID)
		if err != nil {
			return nil, err
		}
		return GetGroupByIDResponse{Group: group}, nil
	}
}

func makeUpdateGroupEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(UpdateGroupRequest)
		err := s.UpdateGroup(ctx, tenantID, req.ID, req.Group)
		if err != nil {
			return nil, err
		}
		return UpdateGroupResponse{}, nil
	}
}

func makeDeleteGroupEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(DeleteGroupRequest)
		err := s.DeleteGroup(ctx, tenantID, req.ID)
		if err != nil {
			return nil, err
		}
		return DeleteGroupResponse{}, nil
	}
}

func makeAddUserToGroupEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(AddUserToGroupRequest)
		err := s.AddUserToGroup(ctx, tenantID, req.UserID, req.GroupID)
		if err != nil {
			return nil, err
		}
		return AddUserToGroupResponse{}, nil
	}
}

func makeRemoveUserFromGroupEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		tenantID := ctx.Value(TenantIDContextKey).(string)
		req := request.(RemoveUserFromGroupRequest)
		err := s.RemoveUserFromGroup(ctx, tenantID, req.UserID, req.GroupID)
		if err != nil {
			return nil, err
		}
		return RemoveUserFromGroupResponse{}, nil
	}
}


// HealthCheckResponse holds the response values for the HealthCheck endpoint.
type HealthCheckResponse struct {
	Healthy bool `json:"healthy"`
}

// CreateUserRequest holds the request parameters for the CreateUser endpoint.
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// CreateUserResponse holds the response values for the CreateUser endpoint.
type CreateUserResponse struct {
	UserID string `json:"user_id"`
}

// GetUserByEmailRequest holds the request parameters for the GetUserByEmail endpoint.
type GetUserByEmailRequest struct {
	Email string
}

// GetUserByEmailResponse holds the response values for the GetUserByEmail endpoint.
type GetUserByEmailResponse struct {
	User User `json:"user"`
}

// GetUserByIDRequest holds the request parameters for the GetUserByID endpoint.
type GetUserByIDRequest struct {
	ID string
}

// GetUserByIDResponse holds the response values for the GetUserByID endpoint.
type GetUserByIDResponse struct {
	User User `json:"user"`
}

// UpdateUserRequest holds the request parameters for the UpdateUser endpoint.
type UpdateUserRequest struct {
	ID   string `json:"id"`
	User User   `json:"user"`
}

// UpdateUserResponse holds the response values for the UpdateUser endpoint.
type UpdateUserResponse struct{}

// DeleteUserRequest holds the request parameters for the DeleteUser endpoint.
type DeleteUserRequest struct {
	ID string
}

// DeleteUserResponse holds the response values for the DeleteUser endpoint.
type DeleteUserResponse struct{}

// CreateGroupRequest holds the request parameters for the CreateGroup endpoint.
type CreateGroupRequest struct {
	Group Group `json:"group"`
}

// CreateGroupResponse holds the response values for the CreateGroup endpoint.
type CreateGroupResponse struct {
	GroupID string `json:"group_id"`
}

// GetGroupByIDRequest holds the request parameters for the GetGroupByID endpoint.
type GetGroupByIDRequest struct {
	ID string
}

// GetGroupByIDResponse holds the response values for the GetGroupByID endpoint.
type GetGroupByIDResponse struct {
	Group Group `json:"group"`
}

// UpdateGroupRequest holds the request parameters for the UpdateGroup endpoint.
type UpdateGroupRequest struct {
	ID    string `json:"id"`
	Group Group  `json:"group"`
}

// UpdateGroupResponse holds the response values for the UpdateGroup endpoint.
type UpdateGroupResponse struct{}

// DeleteGroupRequest holds the request parameters for the DeleteGroup endpoint.
type DeleteGroupRequest struct {
	ID string
}

// DeleteGroupResponse holds the response values for the DeleteGroup endpoint.
type DeleteGroupResponse struct{}

// AddUserToGroupRequest holds the request parameters for the AddUserToGroup endpoint.
type AddUserToGroupRequest struct {
	UserID  string `json:"user_id"`
	GroupID string `json:"group_id"`
}

// AddUserToGroupResponse holds the response values for the AddUserToGroup endpoint.
type AddUserToGroupResponse struct{}

// RemoveUserFromGroupRequest holds the request parameters for the RemoveUserFromGroup endpoint.
type RemoveUserFromGroupRequest struct {
	UserID  string `json:"user_id"`
	GroupID string `json:"group_id"`
}

// RemoveUserFromGroupResponse holds the response values for the RemoveUserFromGroup endpoint.
type RemoveUserFromGroupResponse struct{}
