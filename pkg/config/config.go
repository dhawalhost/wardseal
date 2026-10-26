// Package config provides configuration management for WardSeal, aligned with gokit standards.
package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/viper"
	"github.com/subosito/gotenv"

	"github.com/dhawalhost/wardseal/pkg/database"
	"github.com/dhawalhost/wardseal/pkg/types"
)

// Environment represents the deployment environment.
type Environment string

const (
	Development Environment = "development"
	Staging     Environment = "staging"
	Production  Environment = "production"
)

// Config is the top-level configuration for WardSeal services.
type Config struct {
	Environment   Environment         `mapstructure:"environment"`
	Database      DatabaseConfig      `mapstructure:"database"`
	Auth          AuthConfig          `mapstructure:"auth"`
	Directory     DirectoryConfig     `mapstructure:"directory"`
	Governance    GovernanceConfig    `mapstructure:"governance"`
	Observability ObservabilityConfig `mapstructure:"observability"`
	KMS           KMSConfig           `mapstructure:"kms"`
	License       LicenseConfig       `mapstructure:"license"`
	Slack         SlackConfig         `mapstructure:"slack"`
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host     string       `mapstructure:"host"`
	Port     int          `mapstructure:"port"`
	User     string       `mapstructure:"user"`
	Password types.Secret `mapstructure:"password"` // Populated by Vault or Env
	Name            string        `mapstructure:"name"`
	SSLMode         string        `mapstructure:"sslmode"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

// ConnectionString returns the PostgreSQL connection string.
func (d DatabaseConfig) ConnectionString() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		d.User, d.Password.Raw(), d.Host, d.Port, d.Name, d.SSLMode)
}

// ConnectionConfig returns a database.Config populated with connection and pool parameters.
func (d DatabaseConfig) ConnectionConfig() database.Config {
	return database.Config{
		Host:            d.Host,
		Port:            d.Port,
		User:            d.User,
		Password:        d.Password.Raw(),
		DBName:          d.Name,
		SSLMode:         d.SSLMode,
		MaxOpenConns:    d.MaxOpenConns,
		MaxIdleConns:    d.MaxIdleConns,
		ConnMaxLifetime: d.ConnMaxLifetime,
	}
}

// AuthConfig holds auth service settings.
type AuthConfig struct {
	BaseURL             string           `mapstructure:"base_url"`
	DirectoryServiceURL string           `mapstructure:"directory_service_url"`
	ServiceAuthToken    types.Secret     `mapstructure:"service_auth_token"`
	ServiceAuthHeader   string           `mapstructure:"service_auth_header"`
	JWTPrivateKeyPath   string           `mapstructure:"jwt_private_key_path"`
	JWTPublicKeyPath    string           `mapstructure:"jwt_public_key_path"`
	DeploymentMode      string           `mapstructure:"deployment_mode"`
	UIURL               string           `mapstructure:"ui_url"`
	RedisAddr           string           `mapstructure:"redis_addr"`
	RedisPassword       types.Secret     `mapstructure:"redis_password"`
	RedisDB             int              `mapstructure:"redis_db"`
	CookieDomain        string           `mapstructure:"cookie_domain"`
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

// RedisAddrs returns the parsed list of Redis addresses configured in AuthConfig.
func (a AuthConfig) RedisAddrs() []string {
	return ParseAddresses(a.RedisAddr)
}

type RateLimitProfile struct {
	Requests int           `mapstructure:"requests"`
	Window   time.Duration `mapstructure:"window"`
}

type DirectoryConfig struct {
	ServiceAuthToken  types.Secret `mapstructure:"service_auth_token"`
	ServiceAuthHeader string       `mapstructure:"service_auth_header"`
}

type GovernanceConfig struct {
	DirectoryServiceURL string       `mapstructure:"directory_service_url"`
	WebhookSecret       types.Secret `mapstructure:"webhook_secret"`
	CORSAllowedOrigins  []string     `mapstructure:"cors_allowed_origins"`
}

type ObservabilityConfig struct {
	OTELEndpoint   string `mapstructure:"otel_endpoint"`
	ServiceName    string `mapstructure:"service_name"`
	ServiceVersion string `mapstructure:"service_version"`
	LogLevel       string `mapstructure:"log_level"`
}

type LicenseConfig struct {
	Required      bool         `mapstructure:"required"`
	Key           types.Secret `mapstructure:"key"`
	PublicKeyPath string       `mapstructure:"public_key_path"`
}

type KMSConfig struct {
	Provider       string       `mapstructure:"provider"`
	PrivateKeyPath string       `mapstructure:"private_key_path"`
	PublicKeyPath  string       `mapstructure:"public_key_path"`
	MasterKey      types.Secret `mapstructure:"master_key"` // Used for symmetric encryption (AES-256-GCM)
	VaultAddr      string       `mapstructure:"vault_addr"`
	VaultToken     types.Secret `mapstructure:"vault_token"`
	VaultKeyName   string       `mapstructure:"vault_key_name"`
	VaultKeyPath   string       `mapstructure:"vault_key_path"`
	VaultNamespace string       `mapstructure:"vault_namespace"`
	VaultRoleID    string       `mapstructure:"vault_role_id"`
	VaultSecretID  types.Secret `mapstructure:"vault_secret_id"`
}

type SlackConfig struct {
	Enabled    bool         `mapstructure:"enabled"`
	WebhookURL types.Secret `mapstructure:"webhook_url"`
	AppToken   types.Secret `mapstructure:"app_token"`
	BotToken   types.Secret `mapstructure:"bot_token"`
	ChannelID  string       `mapstructure:"channel_id"`
}

// Load reads configuration using Viper, aligned with gokit patterns.
func Load(cfgFile string) (*Config, error) {
	v := viper.New()

	// Defaults (Matches gokit/config where applicable)
	v.SetDefault("environment", "development")
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "user")
	v.SetDefault("database.name", "identity_platform")
	v.SetDefault("database.sslmode", "disable")
	v.SetDefault("database.max_open_conns", 25)
	v.SetDefault("database.max_idle_conns", 25)
	v.SetDefault("database.conn_max_lifetime", 5*time.Minute)

	v.SetDefault("auth.base_url", "http://localhost:8080")
	v.SetDefault("auth.directory_service_url", "http://localhost:8081")
	v.SetDefault("auth.service_auth_header", "X-Service-Auth")
	v.SetDefault("auth.rate_limit_use_tenant", true)
	v.SetDefault("auth.rate_limit_key_prefix", "authsvc:ratelimit")
	v.SetDefault("directory.service_auth_header", "X-Service-Auth")

	v.SetDefault("observability.log_level", "info")
	v.SetDefault("kms.provider", "local")
	v.SetDefault("kms.vault_key_name", "wardseal-signing-key")
	v.SetDefault("kms.vault_key_path", "transit")

	v.SetDefault("slack.enabled", false)
	v.SetDefault("governance.cors_allowed_origins", []string{"http://localhost:5173"})

	// Environment variables
	v.SetEnvPrefix("APP") // Align with gokit default prefix
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()
	// Chart/docs-compatible aliases (Helm often sets DB_*, ENVIRONMENT, SERVICE_AUTH_*, REDIS_ADDR).
	_ = v.BindEnv("environment", "ENVIRONMENT", "APP_ENVIRONMENT")
	_ = v.BindEnv("database.host", "DB_HOST", "APP_DATABASE_HOST")
	_ = v.BindEnv("database.port", "DB_PORT", "APP_DATABASE_PORT")
	_ = v.BindEnv("database.user", "DB_USER", "APP_DATABASE_USER")
	_ = v.BindEnv("database.password", "DB_PASSWORD", "DATABASE_PASSWORD", "APP_DATABASE_PASSWORD")
	_ = v.BindEnv("database.name", "DB_NAME", "APP_DATABASE_NAME")
	_ = v.BindEnv("database.sslmode", "DB_SSLMODE", "APP_DATABASE_SSLMODE")
	_ = v.BindEnv("auth.base_url", "AUTH_SERVICE_URL", "APP_AUTH_BASE_URL")
	_ = v.BindEnv("auth.directory_service_url", "DIRECTORY_SERVICE_URL", "APP_AUTH_DIRECTORY_SERVICE_URL")
	_ = v.BindEnv("auth.deployment_mode", "DEPLOYMENT_MODE", "APP_AUTH_DEPLOYMENT_MODE")
	_ = v.BindEnv("auth.ui_url", "UI_URL", "APP_AUTH_UI_URL")
	_ = v.BindEnv("auth.service_auth_token", "SERVICE_AUTH_TOKEN", "APP_AUTH_SERVICE_AUTH_TOKEN")
	_ = v.BindEnv("auth.service_auth_header", "SERVICE_AUTH_HEADER", "APP_AUTH_SERVICE_AUTH_HEADER")
	_ = v.BindEnv("auth.jwt_private_key_path", "JWT_PRIVATE_KEY_PATH", "APP_AUTH_JWT_PRIVATE_KEY_PATH")
	_ = v.BindEnv("auth.jwt_public_key_path", "JWT_PUBLIC_KEY_PATH", "APP_AUTH_JWT_PUBLIC_KEY_PATH")
	_ = v.BindEnv("auth.redis_addr", "REDIS_ADDR", "APP_AUTH_REDIS_ADDR")
	_ = v.BindEnv("auth.redis_password", "REDIS_PASSWORD", "APP_AUTH_REDIS_PASSWORD")
	_ = v.BindEnv("auth.cookie_domain", "COOKIE_DOMAIN", "APP_AUTH_COOKIE_DOMAIN")
	_ = v.BindEnv("directory.service_auth_token", "SERVICE_AUTH_TOKEN", "APP_DIRECTORY_SERVICE_AUTH_TOKEN")
	_ = v.BindEnv("directory.service_auth_header", "SERVICE_AUTH_HEADER", "APP_DIRECTORY_SERVICE_AUTH_HEADER")
	_ = v.BindEnv("governance.directory_service_url", "DIRECTORY_SERVICE_URL", "APP_GOVERNANCE_DIRECTORY_SERVICE_URL")
	_ = v.BindEnv("governance.webhook_secret", "WEBHOOK_SECRET", "APP_GOVERNANCE_WEBHOOK_SECRET")
	_ = v.BindEnv("governance.cors_allowed_origins", "CORS_ALLOWED_ORIGINS", "APP_GOVERNANCE_CORS_ALLOWED_ORIGINS")
	_ = v.BindEnv("kms.provider", "KMS_PROVIDER", "APP_KMS_PROVIDER")
	_ = v.BindEnv("kms.master_key", "KMS_MASTER_KEY", "APP_KMS_MASTER_KEY")
	_ = v.BindEnv("kms.private_key_path", "KMS_PRIVATE_KEY_PATH", "APP_KMS_PRIVATE_KEY_PATH")
	_ = v.BindEnv("kms.public_key_path", "KMS_PUBLIC_KEY_PATH", "APP_KMS_PUBLIC_KEY_PATH")
	_ = v.BindEnv("kms.vault_addr", "VAULT_ADDR", "APP_KMS_VAULT_ADDR")
	_ = v.BindEnv("kms.vault_token", "VAULT_TOKEN", "APP_KMS_VAULT_TOKEN")
	_ = v.BindEnv("kms.vault_key_name", "VAULT_KEY_NAME", "APP_KMS_VAULT_KEY_NAME")
	_ = v.BindEnv("kms.vault_key_path", "VAULT_KEY_PATH", "APP_KMS_VAULT_KEY_PATH")
	_ = v.BindEnv("kms.vault_namespace", "VAULT_NAMESPACE", "APP_KMS_VAULT_NAMESPACE")
	_ = v.BindEnv("kms.vault_role_id", "VAULT_ROLE_ID", "APP_KMS_VAULT_ROLE_ID")
	_ = v.BindEnv("kms.vault_secret_id", "VAULT_SECRET_ID", "APP_KMS_VAULT_SECRET_ID")
	_ = v.BindEnv("observability.otel_endpoint", "OTEL_ENDPOINT", "APP_OBSERVABILITY_OTEL_ENDPOINT")
	_ = v.BindEnv("observability.service_name", "OTEL_SERVICE_NAME", "APP_OBSERVABILITY_SERVICE_NAME")
	_ = v.BindEnv("observability.service_version", "OTEL_SERVICE_VERSION", "APP_OBSERVABILITY_SERVICE_VERSION")
	_ = v.BindEnv("observability.log_level", "LOG_LEVEL", "APP_OBSERVABILITY_LOG_LEVEL")

	// Optional config file
	if cfgFile != "" {
		if strings.HasSuffix(cfgFile, ".env") || filepath.Base(cfgFile) == ".env" {
			if err := gotenv.Load(cfgFile); err != nil {
				return nil, fmt.Errorf("config: load env file: %w", err)
			}
		} else {
			v.SetConfigFile(cfgFile)
			if err := v.ReadInConfig(); err != nil {
				return nil, fmt.Errorf("config: read config file: %w", err)
			}
		}
	} else {
		// Try to load standard .env if no file provided
		_ = gotenv.Load(".env")
	}

	decoderHook := mapstructure.ComposeDecodeHookFunc(
		mapstructure.StringToTimeDurationHookFunc(),
		mapstructure.StringToSliceHookFunc(","),
		mapstructure.TextUnmarshallerHookFunc(),
		stringToSecretHookFunc(),
	)

	var cfg Config
	if err := v.Unmarshal(&cfg, viper.DecodeHook(decoderHook)); err != nil {
		return nil, fmt.Errorf("config: unmarshal: %w", err)
	}

	// Post-processing: Vault integration
	// Post-processing: Vault integration
	if cfg.KMS.VaultAddr != "" {
		// Late-binding from Vault is handled dynamically in the KMS package.
		// No immediate action needed here during initialization sweep.
		_ = cfg.KMS.VaultAddr
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// MustLoad is like Load but panics on error.
func MustLoad() *Config {
	cfgFile := os.Getenv("APP_CONFIG")
	if cfgFile == "" {
		cfgFile = os.Getenv("CONFIG_FILE")
	}

	cfg, err := Load(cfgFile)
	if err != nil {
		panic(fmt.Sprintf("config: MustLoad: %v", err))
	}
	return cfg
}

func (c *Config) Validate() error {
	var problems []string

	if err := validateAbsoluteURL(c.Auth.BaseURL, false); err != nil {
		problems = append(problems, fmt.Sprintf("AUTH_SERVICE_URL invalid: %v", err))
	}

	if err := validateAbsoluteURL(c.Auth.UIURL, false); err != nil {
		problems = append(problems, fmt.Sprintf("UI_URL invalid: %v", err))
	}

	for _, origin := range c.Governance.CORSAllowedOrigins {
		u, err := url.Parse(origin)
		if err != nil || u.Path != "" {
			problems = append(problems, fmt.Sprintf("CORS_ALLOWED_ORIGIN '%s' is invalid or contains a path", origin))
		}
	}

	if c.Environment == Staging || c.Environment == Production {
		if err := validateAbsoluteURL(c.Auth.BaseURL, true); err != nil {
			problems = append(problems, fmt.Sprintf("AUTH_SERVICE_URL must be https in %s: %v", c.Environment, err))
		}

		if !strings.EqualFold(c.KMS.Provider, "vault") {
			problems = append(problems, fmt.Sprintf("KMS_PROVIDER must be 'vault' in %s", c.Environment))
		}

		if c.KMS.VaultAddr == "" {
			problems = append(problems, fmt.Sprintf("VAULT_ADDR is required in %s", c.Environment))
		}

		hasAuth := !c.KMS.VaultToken.IsEmpty() || (c.KMS.VaultRoleID != "" && !c.KMS.VaultSecretID.IsEmpty())
		if !hasAuth {
			problems = append(problems, fmt.Sprintf("Vault authentication is required in %s", c.Environment))
		}
		if c.Database.SSLMode == "disable" {
			problems = append(problems, fmt.Sprintf("database.sslmode cannot be 'disable' in %s environment", c.Environment))
		}
	} else {
		// In development/local mode, ensure master key is 32 bytes for AES-256
		if c.KMS.Provider == "local" || c.KMS.Provider == "" {
			if !c.KMS.MasterKey.IsEmpty() && len(c.KMS.MasterKey.Raw()) != 32 {
				problems = append(problems, "KMS_MASTER_KEY must be exactly 32 bytes for local AES-256 encryption")
			}
		}

		// Ensure JWT paths are set for the "local" environment (as expected by tests)
		if c.Environment == "local" {
			if c.Auth.JWTPrivateKeyPath == "" || c.Auth.JWTPublicKeyPath == "" {
				problems = append(problems, "JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH are required in local")
			}
		}
	}

	if len(problems) > 0 {
		return fmt.Errorf("configuration validation failed: %s", strings.Join(problems, "; "))
	}

	return nil
}

func validateAbsoluteURL(raw string, requireHTTPS bool) error {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return err
	}
	if !u.IsAbs() || u.Host == "" {
		return fmt.Errorf("must be an absolute URL with host")
	}
	scheme := strings.ToLower(u.Scheme)
	if requireHTTPS && scheme != "https" {
		return fmt.Errorf("scheme must be https")
	}
	return nil
}

// ResolvePort resolves the network listen address given a default port and optional specific env vars.
// It checks envVarNames first, then "PORT", and falls back to defaultPort.
// It ensures the returned address starts with ":".
func ResolvePort(defaultPort string, envVarNames ...string) string {
	for _, envVar := range envVarNames {
		if val := os.Getenv(envVar); val != "" {
			return formatPort(val)
		}
	}
	if val := os.Getenv("PORT"); val != "" {
		return formatPort(val)
	}
	return formatPort(defaultPort)
}

func formatPort(p string) string {
	p = strings.TrimSpace(p)
	if !strings.HasPrefix(p, ":") {
		return ":" + p
	}
	return p
}

// ParseAddresses splits a comma-separated list of network host:port addresses,
// trimming whitespace and ignoring empty elements.
func ParseAddresses(s string) []string {
	var res []string
	for _, part := range strings.Split(s, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			res = append(res, trimmed)
		}
	}
	return res
}

func stringToSecretHookFunc() mapstructure.DecodeHookFuncType {
	return func(f reflect.Type, t reflect.Type, data interface{}) (interface{}, error) {
		if t == reflect.TypeOf(types.Secret{}) {
			if str, ok := data.(string); ok {
				return types.NewSecret(str), nil
			}
		}
		return data, nil
	}
}

