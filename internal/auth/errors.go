package auth

import "errors"

var (
	// ErrSystemSetupUnavailable indicates that system setup cannot be run because it is disabled or already completed.
	ErrSystemSetupUnavailable = errors.New("system setup not required (or already completed)")

	// ErrUserAlreadyExists indicates that a user account with the specified email already exists.
	ErrUserAlreadyExists = errors.New("an account with this email already exists; please log in to your existing organization")

	// ErrTenantConflict indicates that tenant creation resulted in a conflict or duplicate.
	ErrTenantConflict = errors.New("tenant conflict")
)
