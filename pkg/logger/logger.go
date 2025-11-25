
package logger

import (
	"log/slog"
	"os"
)

// New returns a new logger.
func New(level slog.Level) *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))
}
