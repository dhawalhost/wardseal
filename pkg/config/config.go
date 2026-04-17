package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	kitconfig "github.com/dhawalhost/gokit/config"
	"github.com/dhawalhost/wardseal/pkg/types"
	"github.com/go-playground/validator/v10"
	"github.com/spf13/viper"
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
	Environment      Environment      `mapstructure:"environment" validate:"required"`
	Auth             AuthConfig       `mapstructure:"auth" validate:"required"`
	Directory        DirectoryConfig  `mapstructure:"directory" validate:"required"`
	Governance       GovernanceConfig `mapstructure:"governance" validate:"required"`
	KMS              KMSConfig        `mapstructure:"kms" validate:"required"`
	License          LicenseConfig    `mapstructure:"license"`
}

// AuthConfig holds auth service settings.
type AuthConfig struct {
	BaseURL             string           `mapstructure:"base_url" validate:"required,url"`
	DirectoryServiceURL string           `mapstructure:"directory_service_url" validate:"required,url"`
	ServiceAuthToken    types.Secret     `mapstructure:"service_auth_token"`
	ServiceAuthHeader   string           `mapstructure:"service_auth_header"`
	JWTPrivateKeyPath   string           `mapstructure:"jwt_private_key_path"`
	JWTPublicKeyPath    string           `mapstructure:"jwt_public_key_path"`
	DeploymentMode      string           `mapstructure:"deployment_mode" validate:"oneof=saas selfhost"`
	UIURL               string           `mapstructure:"ui_url" validate:"required,url"`
	WebAuthnSessionTTL  time.Duration    `mapstructure:"webauthn_session_ttl" validate:"required"`
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
	ServiceAuthToken  types.Secret `mapstructure:"service_auth_token"`
	ServiceAuthHeader string       `mapstructure:"service_auth_header"`
}

// GovernanceConfig holds governance service settings.
type GovernanceConfig struct {
	DirectoryServiceURL string       `mapstructure:"directory_service_url" validate:"required,url"`
	WebhookSecret       types.Secret `mapstructure:"webhook_secret"`
	CORSAllowedOrigins  []string     `mapstructure:"cors_allowed_origins" validate:"dive,url"`
}

// LicenseConfig holds enterprise license settings.
type LicenseConfig struct {
	Required      bool         `mapstructure:"required"`
	Key           types.Secret `mapstructure:"key"`
	PublicKeyPath string       `mapstructure:"public_key_path"`
}

// KMSConfig holds settings for Key Management Service (Vault or Local).
type KMSConfig struct {
	Provider       string       `mapstructure:"provider" validate:"oneof=local vault"`
	PrivateKeyPath string       `mapstructure:"private_key_path"`
	PublicKeyPath  string       `mapstructure:"public_key_path"`
	VaultAddr      string       `mapstructure:"vault_addr" validate:"required_if=Provider vault"`
	VaultToken     types.Secret `mapstructure:"vault_token" validate:"required_if=Provider vault"`
	VaultKeyName   string       `mapstructure:"vault_key_name"`
	VaultKeyPath   string       `mapstructure:"vault_key_path"`
	VaultNamespace string       `mapstructure:"vault_namespace"`
	VaultRoleID    string       `mapstructure:"vault_role_id"`
	VaultSecretID  types.Secret `mapstructure:"vault_secret_id"`
}

var validate = validator.New()

func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvPrefix("APP")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// 1. Load Defaults from .env.defaults
	v.SetConfigType("env")
	v.SetConfigName(".env.defaults")
	v.AddConfigPath("config")
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("config: read .env.defaults: %w", err)
	}

	// 2. Merge Environment-specific/Local .env if it exists
	v.SetConfigFile(".env")
	_ = v.MergeInConfig()

	// 3. Fallback to Primary Config File if set
	if cfgFile := os.Getenv("APP_CONFIG_FILE"); cfgFile != "" {
		v.SetConfigFile(cfgFile)
		_ = v.MergeInConfig()
	}

	// 4. Extract base kitconfig (maintaining compatibility with gokit logic)
	// kitconfig.Load internally uses its own viper, so we use it for pure infra
	base, err := kitconfig.Load(os.Getenv("APP_CONFIG_FILE"))
	if err != nil {
		return nil, fmt.Errorf("config: load base: %w", err)
	}

	cfg := &Config{Config: *base}

	// 5. Unmarshal everything into the full Config struct
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("config: unmarshal: %w", err)
	}

	// 6. Post-processing & Enforcement
	if cfg.Environment == "" {
		cfg.Environment = Development
	}

	// 7. Declarative Validation
	if err := validate.Struct(cfg); err != nil {
		return nil, fmt.Errorf("config: validation failed: %w", err)
	}

	// 8. Security Guardrails
	if cfg.Environment == Production {
		if err := enforceProductionStandards(cfg); err != nil {
			return nil, err
		}
	}

	return cfg, nil
}

func enforceProductionStandards(cfg *Config) error {
	urls := []string{cfg.Auth.BaseURL, cfg.Auth.DirectoryServiceURL, cfg.Governance.DirectoryServiceURL}
	for _, raw := range urls {
		u, _ := url.Parse(raw)
		if u.Scheme != "https" {
			return fmt.Errorf("production standard violation: insecure scheme in URL %q", raw)
		}
	}
	return nil
}

func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(err)
	}
	return cfg
}

func (c *Config) Validate() error {
	return validate.Struct(c)
}
