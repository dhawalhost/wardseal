package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/dhawalhost/velverify/internal/directory"
	"github.com/dhawalhost/velverify/pkg/database"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/dhawalhost/velverify/pkg/middleware"
	"github.com/dhawalhost/velverify/pkg/observability"
	"github.com/gorilla/mux"
)

func main() {
	log := logger.New(slog.LevelDebug)

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	// Database connection
	dbConfig := database.Config{
		Host:     dbHost,
		Port:     5432,
		User:     "user",
		Password: "password",
		DBName:   "identity_platform",
		SSLMode:  "disable",
	}
	db, err := database.NewConnection(dbConfig)
	if err != nil {
		log.Error("Failed to connect to database", "err", err)
		os.Exit(1)
	}

	var svc directory.Service
	{
		svc = directory.NewService(db)
		// Add logging and metrics middleware here
	}

	metrics := observability.NewMetrics()

	var h http.Handler
	{
		endpoints := directory.MakeEndpoints(svc)
		h = directory.NewHTTPHandler(endpoints, log)
	}

	r := mux.NewRouter()
	r.Handle("/metrics", observability.Handler())
	r.PathPrefix("/").Handler(h)

	log.Info("HTTP server starting", "addr", ":8081")
	if err := http.ListenAndServe(":8081", middleware.Metrics(metrics)(r)); err != nil {
		log.Error("HTTP server failed", "err", err)
		os.Exit(1)
	}
}
