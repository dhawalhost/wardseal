package config

import "testing"

func TestValidate_AllowsDevelopmentHTTP(t *testing.T) {
	cfg := &Config{
		Environment: Development,
		Auth: AuthConfig{
			BaseURL: "http://auth.wardseal.local",
			UIURL:   "http://manage.wardseal.local",
		},
		Governance: GovernanceConfig{
			CORSAllowedOrigins: []string{"http://manage.wardseal.local", "http://wardseal.local"},
		},
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected development config to validate, got error: %v", err)
	}
}

func TestValidate_RejectsInvalidUIURL(t *testing.T) {
	cfg := &Config{
		Environment: Development,
		Auth: AuthConfig{
			BaseURL: "http://auth.wardseal.local",
			UIURL:   "manage.wardseal.local",
		},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for invalid UI_URL")
	}
}

func TestValidate_RequiresHTTPSInStaging(t *testing.T) {
	cfg := &Config{
		Environment: Staging,
		Auth: AuthConfig{
			BaseURL: "http://auth-staging.wardseal.com",
			UIURL:   "https://manage-staging.wardseal.com",
		},
		KMS: KMSConfig{Provider: "vault"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for non-https AUTH_SERVICE_URL in staging")
	}
}

func TestValidate_RequiresVaultKMSInProduction(t *testing.T) {
	cfg := &Config{
		Environment: Production,
		Auth: AuthConfig{
			BaseURL: "https://auth.wardseal.com",
			UIURL:   "https://manage.wardseal.com",
		},
		KMS: KMSConfig{Provider: "local"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for non-vault KMS in production")
	}
}

func TestValidate_RequiresJWTPathsInLocal(t *testing.T) {
	cfg := &Config{
		Environment: Environment("local"),
		Auth: AuthConfig{
			BaseURL: "http://auth.wardseal.local",
			UIURL:   "http://manage.wardseal.local",
		},
		KMS: KMSConfig{Provider: "local"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error when JWT key paths are missing in local")
	}
}

func TestValidate_AllowsLocalWithJWTPaths(t *testing.T) {
	cfg := &Config{
		Environment: Environment("local"),
		Auth: AuthConfig{
			BaseURL:           "http://auth.wardseal.local",
			UIURL:             "http://manage.wardseal.local",
			JWTPrivateKeyPath: "/etc/wardseal/keys/private_key.pem",
			JWTPublicKeyPath:  "/etc/wardseal/keys/public_key.pem",
		},
		KMS: KMSConfig{Provider: "local"},
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected local config with JWT paths to validate, got error: %v", err)
	}
}

func TestValidate_RejectsCORSOriginWithPath(t *testing.T) {
	cfg := &Config{
		Environment: Development,
		Auth: AuthConfig{
			BaseURL: "http://auth.wardseal.local",
			UIURL:   "http://manage.wardseal.local",
		},
		Governance: GovernanceConfig{
			CORSAllowedOrigins: []string{"http://manage.wardseal.local/app"},
		},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for CORS origin containing a path")
	}
}

func TestResolvePort(t *testing.T) {
	// 1. Default port fallback
	if got := ResolvePort("8080"); got != ":8080" {
		t.Errorf("expected :8080, got %s", got)
	}
	if got := ResolvePort(":8081"); got != ":8081" {
		t.Errorf("expected :8081, got %s", got)
	}

	// 2. PORT env var
	t.Setenv("PORT", "9000")
	if got := ResolvePort(":8080"); got != ":9000" {
		t.Errorf("expected :9000, got %s", got)
	}

	// 3. Service specific env var precedence over PORT
	t.Setenv("AUTHSVC_PORT", "9001")
	if got := ResolvePort(":8080", "AUTHSVC_PORT"); got != ":9001" {
		t.Errorf("expected :9001, got %s", got)
	}
}

func TestLoad_EnvWithSecret(t *testing.T) {
	t.Setenv("DATABASE_PASSWORD", "super-secret-db-pass")
	t.Setenv("KMS_MASTER_KEY", "12345678901234567890123456789012")
	t.Setenv("REDIS_PASSWORD", "redis-pass-123")
	t.Setenv("AUTH_SERVICE_URL", "http://auth.wardseal.local")
	t.Setenv("UI_URL", "http://manage.wardseal.local")

	cfg, err := Load("")
	if err != nil {
		t.Fatalf("unexpected error loading config with env secrets: %v", err)
	}

	if cfg.Database.Password.Raw() != "super-secret-db-pass" {
		t.Errorf("expected database password 'super-secret-db-pass', got '%s'", cfg.Database.Password.Raw())
	}
	if cfg.KMS.MasterKey.Raw() != "12345678901234567890123456789012" {
		t.Errorf("expected master key '12345678901234567890123456789012', got '%s'", cfg.KMS.MasterKey.Raw())
	}
	if cfg.Auth.RedisPassword.Raw() != "redis-pass-123" {
		t.Errorf("expected redis password 'redis-pass-123', got '%s'", cfg.Auth.RedisPassword.Raw())
	}
}

