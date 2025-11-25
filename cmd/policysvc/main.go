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
		fmt.Fprintf(w, "Hello, Policy Service!")
	})

	log.Info("HTTP server starting", "addr", ":8083")
	if err := http.ListenAndServe(":8083", nil); err != nil {
		log.Error("HTTP server failed", "err", err)
		os.Exit(1)
	}
}
