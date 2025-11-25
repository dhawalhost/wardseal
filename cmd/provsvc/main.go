package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/dhawalhost/velverify/pkg/logger"
)

func main() {
	log := logger.New(slog.LevelDebug)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, Provisioning Service!")
	})

	log.Info("HTTP server starting", "addr", ":8084")
	if err := http.ListenAndServe(":8084", nil); err != nil {
		log.Error("HTTP server failed", "err", err)
		os.Exit(1)
	}
}
