package main

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/dhawalhost/wardseal/pkg/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Use centralized config if available, otherwise fallback to env
	cfg, err := config.Load()
	var dsn string
	if err == nil && cfg.Database.DSN != "" {
		dsn = cfg.Database.DSN
	} else {
		dbHost := envOr("DB_HOST", "localhost")
		dsn = fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=%s",
			envOr("DB_USER", "user"),
			envOr("DB_PASSWORD", "password"),
			dbHost,
			envOr("DB_NAME", "identity_platform"),
			envOr("DB_SSLMODE", "disable"),
		)
	}

	fmt.Printf("Connecting to database...\n")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalln(err)
	}

	// Read and sort all .up.sql files from migrations directory
	files, err := os.ReadDir("migrations")
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	var upMigrations []string
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".up.sql") {
			upMigrations = append(upMigrations, f.Name())
		}
	}
	sort.Strings(upMigrations)

	for _, filename := range upMigrations {
		fmt.Printf("Applying migration: %s\n", filename)
		content, err := os.ReadFile("migrations/" + filename) //nolint:gosec // G304: controlled migration path
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", filename, err)
		}

		if err := db.Exec(string(content)).Error; err != nil {
			// Basic error handling - in a real tool we'd track versions in a schema_migrations table
			// and skip already applied ones. For now, we rely on "IF NOT EXISTS" or errors being acceptable/idempotent
			// OR we assume a fresh DB. The most common error on re-run is "already exists", which we can log but warn.
			log.Printf("Warning applying %s: %v", filename, err)
		} else {
			fmt.Printf("Successfully applied %s\n", filename)
		}
	}

	fmt.Println("All migrations processed!")
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
