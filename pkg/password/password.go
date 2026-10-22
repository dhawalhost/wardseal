// Package password provides Argon2id hashing, bcrypt verify compatibility,
// and enterprise password policy checks.
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

const (
	// MinLength is the minimum password length for new passwords.
	MinLength = 12
	// MaxLength caps password size to limit DoS via hashing.
	MaxLength = 128

	argonTime    = 3
	argonMemory  = 64 * 1024 // KiB = 64 MiB
	argonThreads = 4
	argonKeyLen  = 32
	argonSaltLen = 16
)

var (
	ErrTooShort    = errors.New("password must be at least 12 characters long")
	ErrTooLong     = errors.New("password must be at most 128 characters long")
	ErrTooCommon   = errors.New("password is too common or previously breached")
	ErrNeedUpper   = errors.New("password must contain at least one uppercase letter")
	ErrNeedLower   = errors.New("password must contain at least one lowercase letter")
	ErrNeedNumber  = errors.New("password must contain at least one number")
	ErrNeedSpecial = errors.New("password must contain at least one special character")
	ErrInvalidHash = errors.New("invalid password hash")
	ErrMismatch    = errors.New("password does not match")
)

// ValidatePolicy enforces length, complexity, and common-password denylist.
func ValidatePolicy(password string) error {
	if len(password) < MinLength {
		return ErrTooShort
	}
	if len(password) > MaxLength {
		return ErrTooLong
	}
	if commonPasswords[strings.ToLower(password)] {
		return ErrTooCommon
	}

	var hasUpper, hasLower, hasNumber, hasSpecial bool
	for _, char := range password {
		switch {
		case 'a' <= char && char <= 'z':
			hasLower = true
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case '0' <= char && char <= '9':
			hasNumber = true
		case strings.ContainsRune(`!@#$%^&*()-_=+[]{};:'",.<>/?\|~`+"`", char):
			hasSpecial = true
		}
	}
	if !hasUpper {
		return ErrNeedUpper
	}
	if !hasLower {
		return ErrNeedLower
	}
	if !hasNumber {
		return ErrNeedNumber
	}
	if !hasSpecial {
		return ErrNeedSpecial
	}
	return nil
}

// Hash returns an Argon2id encoded hash for a new password.
func Hash(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argonMemory,
		argonTime,
		argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// Verify checks password against Argon2id or legacy bcrypt hashes.
func Verify(encodedHash, password string) error {
	switch {
	case strings.HasPrefix(encodedHash, "$argon2id$"):
		return verifyArgon2id(encodedHash, password)
	case strings.HasPrefix(encodedHash, "$2a$"),
		strings.HasPrefix(encodedHash, "$2b$"),
		strings.HasPrefix(encodedHash, "$2y$"):
		if err := bcrypt.CompareHashAndPassword([]byte(encodedHash), []byte(password)); err != nil {
			return ErrMismatch
		}
		return nil
	default:
		return ErrInvalidHash
	}
}

// NeedsRehash reports whether the stored hash should be upgraded to current Argon2id params.
func NeedsRehash(encodedHash string) bool {
	if !strings.HasPrefix(encodedHash, "$argon2id$") {
		return true // bcrypt or unknown → upgrade
	}
	params, _, _, err := decodeArgon2id(encodedHash)
	if err != nil {
		return true
	}
	return params.memory != argonMemory || params.time != argonTime || params.threads != argonThreads || params.keyLen != argonKeyLen
}

type argonParams struct {
	memory  uint32
	time    uint32
	threads uint8
	keyLen  uint32
}

func verifyArgon2id(encodedHash, password string) error {
	params, salt, key, err := decodeArgon2id(encodedHash)
	if err != nil {
		return err
	}
	other := argon2.IDKey([]byte(password), salt, params.time, params.memory, params.threads, params.keyLen)
	if subtle.ConstantTimeCompare(key, other) != 1 {
		return ErrMismatch
	}
	return nil
}

func decodeArgon2id(encodedHash string) (argonParams, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	// "", "argon2id", "v=19", "m=...,t=...,p=...", salt, key
	if len(parts) != 6 || parts[1] != "argon2id" {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	var p argonParams
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.memory, &p.time, &p.threads); err != nil {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	if len(key) > 1024 {
		return argonParams{}, nil, nil, ErrInvalidHash
	}
	p.keyLen = uint32(len(key)) //nolint:gosec // key length bounded above
	return p, salt, key, nil
}
