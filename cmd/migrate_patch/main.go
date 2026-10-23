package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/dhawalhost/wardseal/pkg/database"
)

func main() {
	dbHost := envOr("DB_HOST", "localhost")
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=%s",
			envOr("DB_USER", "user"),
			envOr("DB_PASSWORD", "password"),
			dbHost,
			envOr("DB_NAME", "identity_platform"),
			envOr("DB_SSLMODE", "disable"),
		)
	}

	migrationsDir := envOr("MIGRATIONS_DIR", "migrations")
	fmt.Printf("Running migrations from '%s'...\n", migrationsDir)

	ctx := context.Background()
	if err := database.RunMigrations(ctx, connStr, migrationsDir); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("All migrations processed successfully via gokit/database!")
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
