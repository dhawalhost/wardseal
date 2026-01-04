package main

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	connStr := fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=%s",
		envOr("DB_USER", "user"),
		envOr("DB_PASSWORD", "password"),
		dbHost,
		envOr("DB_NAME", "identity_platform"),
		envOr("DB_SSLMODE", "disable"),
	)

	fmt.Printf("Connecting to %s...\n", connStr)
	db, err := sqlx.Connect("postgres", connStr)
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
		content, err := os.ReadFile("migrations/" + filename)
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", filename, err)
		}

		if _, err := db.Exec(string(content)); err != nil {
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
