package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"

	"github.com/dhawalhost/gokit/distlock"
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

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	var opts []database.MigrationOptions
	redisAddr := envOr("REDIS_ADDR", "")
	if redisAddr != "" {
		rdb := redis.NewClient(&redis.Options{
			Addr:     redisAddr,
			Password: os.Getenv("REDIS_PASSWORD"),
		})
		defer rdb.Close()
		locker := distlock.NewRedisLocker(rdb)
		opts = append(opts, database.MigrationOptions{
			Locker:  locker,
			LockKey: "lock:wardseal:migrations",
			LockTTL: 60 * time.Second,
		})
		fmt.Println("Distributed migration locking enabled via Redis.")
	}

	ctx := context.Background()
	if err := database.RunMigrator(ctx, db, os.DirFS("."), migrationsDir, opts...); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("All migrations processed successfully via gokit/migration!")
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

