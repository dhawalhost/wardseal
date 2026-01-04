package policy

import (
	"context"
)

// Input represents the data provided for policy evaluation.
type Input struct {
	Subject  Subject                `json:"subject"`
	Action   string                 `json:"action"`
	Resource Resource               `json:"resource"`
	Context  map[string]interface{} `json:"context,omitempty"`
}

type Subject struct {
	ID    string   `json:"id"`
	Roles []string `json:"roles"`
}

type Resource struct {
	Type string `json:"type"`
	ID   string `json:"id"`
	// Additional resource attributes can be passed in Context
}

// Engine defines the interface for policy evaluation.
type Engine interface {
	// Evaluate determines if an action is allowed based on the input.
	// It returns allowed (bool), decision reason (string), and any error.
	Evaluate(ctx context.Context, input Input) (bool, string, error)
}
