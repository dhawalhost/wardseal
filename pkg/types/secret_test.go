package types

import (
	"encoding/json"
	"testing"
)

func TestSecret_MaskingAndZeroing(t *testing.T) {
	s := NewSecret("super-secret-api-token")

	// 1. Raw / Value retrieval
	if s.Raw() != "super-secret-api-token" {
		t.Errorf("expected super-secret-api-token, got %s", s.Raw())
	}
	if s.Value() != "super-secret-api-token" {
		t.Errorf("expected super-secret-api-token, got %s", s.Value())
	}
	if s.IsEmpty() {
		t.Errorf("expected secret to not be empty")
	}

	// 2. Stringer masking
	if s.String() != "[REDACTED]" {
		t.Errorf("expected [REDACTED], got %s", s.String())
	}
	if s.GoString() != "[REDACTED]" {
		t.Errorf("expected [REDACTED], got %s", s.GoString())
	}

	// 3. JSON masking
	jsonBytes, err := json.Marshal(s)
	if err != nil {
		t.Fatalf("failed to marshal json: %v", err)
	}
	if string(jsonBytes) != `"[REDACTED]"` {
		t.Errorf(`expected "[REDACTED]", got %s`, string(jsonBytes))
	}

	// 4. Text unmarshaling (Viper simulation)
	var s2 Secret
	if err := s2.UnmarshalText([]byte("unmarshaled-token")); err != nil {
		t.Fatalf("unmarshal text failed: %v", err)
	}
	if s2.Raw() != "unmarshaled-token" {
		t.Errorf("expected unmarshaled-token, got %s", s2.Raw())
	}

	// 5. Zero scrubbing
	s.Zero()
	if s.Raw() == "super-secret-api-token" {
		t.Errorf("expected raw bytes to be zeroed")
	}
}
