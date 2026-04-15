package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	kitconfig "github.com/dhawalhost/gokit/config"
	"gopkg.in/yaml.v3"
)

// Environment represents the deployment environment.
type Environment string

const (
	Development Environment = "development"
	Staging     Environment = "staging"
	Production  Environment = "production"
)

// Config embeds gokit base config and adds wardseal-specific fields.
type Config struct {
	kitconfig.Config `mapstructure:",squash"`
	Environment      Environment      `mapstructure:"environment"`
	Auth             AuthConfig       `mapstructure:"auth"`
	Directory        DirectoryConfig  `mapstructure:"directory"`
	Governance       GovernanceConfig `mapstructure:"governance"`
	KMS              KMSConfig        `mapstructure:"kms"`
	License          LicenseConfig    `mapstructure:"license"`
}

// AuthConfig holds auth service settings.
type AuthConfig struct {
	BaseURL             string           `mapstructure:"base_url"`
	DirectoryServiceURL string           `mapstructure:"directory_service_url"`
	ServiceAuthToken    string           `mapstructure:"service_auth_token"`
	ServiceAuthHeader   string           `mapstructure:"service_auth_header"`
	JWTPrivateKeyPath   string           `mapstructure:"jwt_private_key_path"`
	JWTPublicKeyPath    string           `mapstructure:"jwt_public_key_path"`
	DeploymentMode      string           `mapstructure:"deployment_mode"`
	UIURL               string           `mapstructure:"ui_url"`
	WebAuthnSessionTTL  time.Duration    `mapstructure:"webauthn_session_ttl"`
	RateLimitUseTenant  bool             `mapstructure:"rate_limit_use_tenant"`
	RateLimitKeyPrefix  string           `mapstructure:"rate_limit_key_prefix"`
	RateLimitDefault    RateLimitProfile `mapstructure:"rate_limit_default"`
	RateLimitLogin      RateLimitProfile `mapstructure:"rate_limit_login"`
	RateLimitToken      RateLimitProfile `mapstructure:"rate_limit_token"`
	RateLimitSetup      RateLimitProfile `mapstructure:"rate_limit_setup"`
	RateLimitWebhook    RateLimitProfile `mapstructure:"rate_limit_webhook"`
	RateLimitDegraded   RateLimitProfile `mapstructure:"rate_limit_degraded"`
}

// RateLimitProfile configures a request budget for a time window.
type RateLimitProfile struct {
	Requests int           `mapstructure:"requests"`
	Window   time.Duration `mapstructure:"window"`
}

// DirectoryConfig holds directory service settings.
type DirectoryConfig struct {
	ServiceAuthToken  string `mapstructure:"service_auth_token"`
	ServiceAuthHeader string `mapstructure:"service_auth_header"`
}

// GovernanceConfig holds governance service settings.
type GovernanceConfig struct {
	DirectoryServiceURL string   `mapstructure:"directory_service_url"`
	WebhookSecret       string   `mapstructure:"webhook_secret"`
	CORSAllowedOrigins  []string `mapstructure:"cors_allowed_origins"`
}

// LicenseConfig holds enterprise license settings.
type LicenseConfig struct {
	Required      bool   `mapstructure:"required"`
	Key           string `mapstructure:"key"`
	PublicKeyPath string `mapstructure:"public_key_path"`
}

// KMSConfig holds settings for Key Management Service (Vault or Local).
type KMSConfig struct {
	Provider       string `mapstructure:"provider"`
	PrivateKeyPath string `mapstructure:"private_key_path"`
	PublicKeyPath  string `mapstructure:"public_key_path"`
	VaultAddr      string `mapstructure:"vault_addr"`
	VaultToken     string `mapstructure:"vault_token"`
	VaultKeyName   string `mapstructure:"vault_key_name"`
	VaultKeyPath   string `mapstructure:"vault_key_path"`
	VaultNamespace string `mapstructure:"vault_namespace"`
	VaultRoleID    string `mapstructure:"vault_role_id"`
	VaultSecretID  string `mapstructure:"vault_secret_id"`
}

func Load() (*Config, error) {
	cfgFile := os.Getenv("APP_CONFIG_FILE")
	base, err := kitconfig.Load(cfgFile)
	if err != nil {
		return nil, err
	}
	cfg := &Config{Config: *base}

	// Environment defaults to development
	if cfg.Environment == "" {
		cfg.Environment = Environment(os.Getenv("ENVIRONMENT"))
		if cfg.Environment == "" {
			cfg.Environment = Development
		}
	}

	if strings.TrimSpace(cfgFile) != "" {
		origins, err := loadCORSOriginsFromYAML(cfgFile)
		if err != nil {
			return nil, err
		}
		cfg.Governance.CORSAllowedOrigins = origins
	}

	if raw, ok := os.LookupEnv("APP_CORS_ALLOWED_ORIGINS"); ok {
		cfg.Governance.CORSAllowedOrigins = parseCSV(raw)
	}

	// Vault integration remains specific to Wardseal
	if vaultAddr := os.Getenv("VAULT_ADDR"); vaultAddr != "" {
		cfg.KMS.VaultAddr = vaultAddr
		// Ideally a vault client loads remaining secrets into config here...
		// For now we keep the same manual env injection for compatibility if needed.
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

type yamlConfig struct {
	Governance GovernanceConfig `yaml:"governance"`
}

func loadCORSOriginsFromYAML(path string) ([]string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("config: read APP_CONFIG_FILE: %w", err)
	}

	var cfg yamlConfig
	if err := yaml.Unmarshal(content, &cfg); err != nil {
		return nil, fmt.Errorf("config: parse APP_CONFIG_FILE: %w", err)
	}

	return cfg.Governance.CORSAllowedOrigins, nil
}

func parseCSV(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		origins = append(origins, part)
	}
	return origins
}

func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(err)
	}
	return cfg
}

func (c *Config) Validate() error {
	var problems []string

	if c.Auth.BaseURL != "" {
		if err := validateAbsoluteURL(c.Auth.BaseURL, c.Environment == Production); err != nil {
			problems = append(problems, fmt.Sprintf("AUTH_BASE_URL invalid: %v", err))
		}
	}

	for _, origin := range c.Governance.CORSAllowedOrigins {
		if err := validateCORSOrigin(origin); err != nil {
			problems = append(problems, fmt.Sprintf("CORS_ALLOWED_ORIGINS invalid origin %q: %v", origin, err))
		}
	}

	if len(problems) > 0 {
		return fmt.Errorf("configuration validation failed: %s", strings.Join(problems, "; "))
	}

	return nil
}

func validateAbsoluteURL(raw string, requireHTTPS bool) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("value is empty")
	}

	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if !u.IsAbs() || u.Host == "" {
		return fmt.Errorf("must be an absolute URL with host")
	}

	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	if requireHTTPS && scheme != "https" {
		return fmt.Errorf("scheme must be https")
	}
	return nil
}

func validateCORSOrigin(raw string) error {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return err
	}
	if !u.IsAbs() || u.Host == "" {
		return fmt.Errorf("must be an absolute URL origin")
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	return nil
}
