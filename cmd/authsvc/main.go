package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/dhawalhost/velverify/internal/auth"
	"github.com/dhawalhost/velverify/pkg/logger"
	"github.com/dhawalhost/velverify/pkg/middleware"
	"github.com/dhawalhost/velverify/pkg/observability"
	"github.com/gorilla/mux"
)

func main() {
	log := logger.New(slog.LevelDebug)

	directoryServiceURL := os.Getenv("DIRECTORY_SERVICE_URL")
	if directoryServiceURL == "" {
		directoryServiceURL = "http://localhost:8081"
	}

	var svc auth.Service
	var err error
	{
		svc, err = auth.NewService(directoryServiceURL)
		if err != nil {
			log.Error("Failed to create service", "err", err)
			os.Exit(1)
		}
	}

	metrics := observability.NewMetrics()

	var h http.Handler
	{
		endpoints := auth.MakeEndpoints(svc)
		h = auth.NewHTTPHandler(endpoints, svc, log)
	}

	r := mux.NewRouter()
	r.Handle("/metrics", observability.Handler())
	r.PathPrefix("/").Handler(h)

	log.Info("HTTP server starting", "addr", ":8080")
	if err := http.ListenAndServe(":8080", middleware.Metrics(metrics)(r)); err != nil {
		log.Error("HTTP server failed", "err", err)
		os.Exit(1)
	}
}
