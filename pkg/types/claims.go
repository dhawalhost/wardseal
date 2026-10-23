package types

import (
	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the standard JWT claims across WardSeal authentication and authorization.
type Claims struct {
	jwt.RegisteredClaims
	Roles  []string               `json:"roles,omitempty"`
	Tenant string                 `json:"tenant,omitempty"`
	Scope  string                 `json:"scope,omitempty"`
	CNF    map[string]interface{} `json:"cnf,omitempty"`
}
