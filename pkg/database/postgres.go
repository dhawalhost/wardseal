package database

import (
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // postgres driver
)

// Config holds the configuration for the database connection.
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewConnection creates a new database connection.
func NewConnection(config Config) (*sqlx.DB, error) { // Use sqlx.DB
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	db, err := sqlx.Connect("postgres", connStr) // Use sqlx.Connect
	if err != nil {
		return nil, err
	}

	// It's a good practice to set connection pool parameters.
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Ping the database to verify the connection.
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}