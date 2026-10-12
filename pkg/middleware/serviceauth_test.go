package middleware

import "testing"

func TestResolveServiceAuthToken(t *testing.T) {
	t.Parallel()

	got, err := ResolveServiceAuthToken("production", "real-token")
	if err != nil || got != "real-token" {
		t.Fatalf("expected real-token, got %q err=%v", got, err)
	}

	got, err = ResolveServiceAuthToken("development", "")
	if err != nil || got != DevServiceAuthToken {
		t.Fatalf("expected dev fallback, got %q err=%v", got, err)
	}

	_, err = ResolveServiceAuthToken("staging", "")
	if err == nil {
		t.Fatal("expected error for empty token in staging")
	}

	_, err = ResolveServiceAuthToken("production", "")
	if err == nil {
		t.Fatal("expected error for empty token in production")
	}
}
