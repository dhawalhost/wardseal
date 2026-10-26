package types

import (
	"encoding/json"

	"github.com/dhawalhost/gokit/secrets"
)

// Secret wraps sensitive values, integrating with gokit/secrets for leak-proof
// redaction in logs/JSON, explicit retrieval via Raw()/Value(), and secure memory scrubbing via Zero().
type Secret struct {
	inner *secrets.Secret
}

// NewSecret constructs a new Secret wrapping gokit/secrets.Secret.
func NewSecret(val string) Secret {
	return Secret{inner: secrets.NewSecret(val)}
}

// String implements fmt.Stringer and returns "[REDACTED]" (or empty string if unset).
func (s Secret) String() string {
	if s.inner == nil || s.inner.Value() == "" {
		return ""
	}
	return s.inner.String()
}

// GoString implements fmt.GoStringer and returns a masked representation.
func (s Secret) GoString() string {
	return s.String()
}

// UnmarshalText implements encoding.TextUnmarshaler to allow Viper/Mapstructure to fill the secret.
func (s *Secret) UnmarshalText(text []byte) error {
	s.inner = secrets.NewSecret(string(text))
	return nil
}

// MarshalText implements encoding.TextMarshaler.
func (s Secret) MarshalText() ([]byte, error) {
	if s.inner == nil || s.inner.Value() == "" {
		return []byte(""), nil
	}
	return s.inner.MarshalText()
}

// MarshalJSON implements json.Marshaler.
func (s Secret) MarshalJSON() ([]byte, error) {
	if s.inner == nil || s.inner.Value() == "" {
		return json.Marshal("")
	}
	return s.inner.MarshalJSON()
}

// Raw returns the underlying unmasked string.
func (s Secret) Raw() string {
	if s.inner == nil {
		return ""
	}
	return s.inner.Value()
}

// Value is an alias for Raw, matching gokit/secrets API.
func (s Secret) Value() string {
	return s.Raw()
}

// IsEmpty returns true if the secret is empty.
func (s Secret) IsEmpty() bool {
	return s.inner == nil || s.inner.Value() == ""
}

// Zero securely wipes the secret bytes from memory.
func (s Secret) Zero() {
	if s.inner != nil {
		s.inner.Zero()
	}
}

// Inner returns the underlying *secrets.Secret.
func (s Secret) Inner() *secrets.Secret {
	return s.inner
}

