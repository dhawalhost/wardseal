// Package routeauthz is the source of truth for management-route authentication
// and authorization requirements. Handlers should stay aligned with this table;
// tests can assert critical surfaces remain covered.
package routeauthz

// AuthMode describes how a route authenticates the caller.
type AuthMode string

const (
	AuthJWT          AuthMode = "jwt"
	AuthService      AuthMode = "service"
	AuthJWTOrService AuthMode = "jwt_or_service"
	AuthSCIM         AuthMode = "scim"
	AuthPublic       AuthMode = "public"
	AuthAPIKey       AuthMode = "api_key"
)

// Route describes one HTTP surface and its required controls.
type Route struct {
	Service  string
	Method   string
	Path     string
	Auth     AuthMode
	Resource string // RBAC resource; empty if auth-only
	Action   string // RBAC action
	Notes    string
}

// Registry lists security-critical management and identity routes.
// Keep in sync when adding mutate endpoints.
var Registry = []Route{
	{Service: "dirsvc", Method: "POST", Path: "/users", Auth: AuthJWTOrService, Resource: "users", Action: "write"},
	{Service: "dirsvc", Method: "PUT", Path: "/users/:id", Auth: AuthJWTOrService, Resource: "users", Action: "write"},
	{Service: "dirsvc", Method: "DELETE", Path: "/users/:id", Auth: AuthJWTOrService, Resource: "users", Action: "delete"},
	{Service: "dirsvc", Method: "POST", Path: "/groups", Auth: AuthJWTOrService, Resource: "groups", Action: "write"},
	{Service: "dirsvc", Method: "PUT", Path: "/groups/:id", Auth: AuthJWTOrService, Resource: "groups", Action: "write"},
	{Service: "dirsvc", Method: "DELETE", Path: "/groups/:id", Auth: AuthJWTOrService, Resource: "groups", Action: "delete"},
	{Service: "dirsvc", Method: "POST", Path: "/internal/tenants", Auth: AuthService, Notes: "public /tenants removed"},
	{Service: "dirsvc", Method: "POST", Path: "/internal/credentials/verify", Auth: AuthService},
	{Service: "dirsvc", Method: "POST", Path: "/scim/v2/Users", Auth: AuthSCIM, Notes: "Bearer only; JWT admin+scim scope or API key scim scope"},
	{Service: "dirsvc", Method: "POST", Path: "/scim/v2/Groups", Auth: AuthSCIM, Notes: "Bearer only; JWT admin+scim scope or API key scim scope"},

	{Service: "authsvc", Method: "POST", Path: "/api/v1/developer/apps", Auth: AuthJWT, Resource: "applications", Action: "write"},
	{Service: "authsvc", Method: "POST", Path: "/api/v1/break-glass/elevate", Auth: AuthJWT, Resource: "roles", Action: "write", Notes: "time-bound super-admin"},
	{Service: "authsvc", Method: "GET", Path: "/oauth2/authorize", Auth: AuthPublic},
	{Service: "authsvc", Method: "POST", Path: "/oauth2/token", Auth: AuthPublic},

	{Service: "govsvc", Method: "POST", Path: "/api/v1/access-requests", Auth: AuthJWT, Resource: "access_requests", Action: "write"},
	{Service: "govsvc", Method: "POST", Path: "/api/v1/campaigns", Auth: AuthJWT, Resource: "campaigns", Action: "write"},
	{Service: "govsvc", Method: "POST", Path: "/api/v1/break-glass/elevate", Auth: AuthJWT, Resource: "roles", Action: "write"},
	{Service: "govsvc", Method: "GET", Path: "/api/v1/audit/export", Auth: AuthJWT, Resource: "audit", Action: "read"},

	{Service: "policysvc", Method: "POST", Path: "/policies", Auth: AuthJWT, Resource: "policies", Action: "write"},
	{Service: "policysvc", Method: "PUT", Path: "/policies/:id", Auth: AuthJWT, Resource: "policies", Action: "write"},
	{Service: "policysvc", Method: "DELETE", Path: "/policies/:id", Auth: AuthJWT, Resource: "policies", Action: "delete"},

	{Service: "mcpsvc", Method: "POST", Path: "/mcp", Auth: AuthAPIKey, Notes: "required outside local"},
}

// MutatingWithPermission returns mutate routes that require RBAC resource/action.
func MutatingWithPermission() []Route {
	out := make([]Route, 0, len(Registry))
	for _, r := range Registry {
		if r.Resource != "" && r.Action != "" {
			out = append(out, r)
		}
	}
	return out
}
