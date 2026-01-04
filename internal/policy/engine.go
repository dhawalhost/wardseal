package policy

import (
	"context"
)

// simpleEngine is a basic implementation of Engine that allows everything by default,
// or implements simple hardcoded rules for now until full OPA integration is ready.
type simpleEngine struct{}

func NewSimpleEngine() Engine {
	return &simpleEngine{}
}

func (e *simpleEngine) Evaluate(ctx context.Context, input Input) (bool, string, error) {
	// Example rule: SOD - Reviewer cannot satisfy their own request
	// This logic should move to Rego policies eventually.

	// Check Context for specific SOD checks
	if requesterID, ok := input.Context["requester_id"].(string); ok {
		if input.Subject.ID == requesterID && input.Action == "approve" {
			return false, "Policy Violation: Separation of Duties - Cannot approve own request", nil
		}
	}

	return true, "Allowed", nil
}
