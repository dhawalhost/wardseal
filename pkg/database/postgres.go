package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // postgres driver

	gokitdatabase "github.com/dhawalhost/gokit/database"
	"github.com/dhawalhost/wardseal/pkg/types"
)

// Config holds the configuration for the database connection and pool parameters.
type Config struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// NewConnection creates a new database connection.
func NewConnection(config Config) (*sqlx.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		return nil, err
	}

	maxOpen := config.MaxOpenConns
	if maxOpen <= 0 {
		maxOpen = 25
	}
	maxIdle := config.MaxIdleConns
	if maxIdle <= 0 {
		maxIdle = 25
	}
	maxLifetime := config.ConnMaxLifetime
	if maxLifetime <= 0 {
		maxLifetime = 5 * time.Minute
	}
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(maxLifetime)

	// Ping the database to verify the connection.
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

// RunInTenantTx executes a callback within a transaction where the tenant ID is set for RLS.
func RunInTenantTx(ctx context.Context, db *sqlx.DB, fn func(tx *sqlx.Tx) error) error {
	tenantID, _ := types.TenantIDFromContext(ctx)
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if tenantID != "" {
		_, err = tx.ExecContext(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID)
		if err != nil {
			return err
		}
	}

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit()
}

// RunMigrations applies pending database migrations from migrationsDir using gokit/database.
func RunMigrations(ctx context.Context, dsn, migrationsDir string) error {
	return gokitdatabase.RunMigrations(ctx, dsn, migrationsDir)
}

// RollbackMigration rolls back the most recent database migration using gokit/database.
func RollbackMigration(ctx context.Context, dsn, migrationsDir string) error {
	return gokitdatabase.RollbackMigration(ctx, dsn, migrationsDir)
}
