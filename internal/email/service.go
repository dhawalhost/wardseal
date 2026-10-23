package email

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/dhawalhost/gokit/notify"
	"go.uber.org/zap"
)

// Service defines the interface for sending emails.
type Service interface {
	SendEmail(ctx context.Context, to []string, subject, body string) error
	SendPasswordSetupLink(ctx context.Context, email, name, link, mode string) error
}

type notifierService struct {
	notifier *notify.Notifier
	from     string
	logger   *zap.Logger
}

// NewService creates a new email service based on environment variables.
// If SMTP_HOST is not configured, it falls back to an in-memory sender.
func NewService(logger *zap.Logger) Service {
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")

	if from == "" {
		from = "no-reply@wardseal.io"
	}

	var sender notify.EmailSender
	if host == "" {
		logger.Warn("SMTP_HOST not set, using mock in-memory email sender")
		sender = notify.NewMemorySender()
	} else {
		port := 587
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}

		var opts []notify.SMTPOption
		if username != "" || password != "" {
			opts = append(opts, notify.WithSMTPCredentials(username, password))
		}
		sender = notify.NewSMTPSender(host, port, opts...)
	}

	return NewServiceWithSender(sender, from, logger)
}

// NewServiceWithSender constructs a Service with an explicit notify.EmailSender (e.g. for testing).
func NewServiceWithSender(sender notify.EmailSender, from string, logger *zap.Logger) Service {
	if from == "" {
		from = "no-reply@wardseal.io"
	}
	n := notify.NewNotifier(
		notify.WithEmailSender(sender),
		notify.WithDefaultFrom(from),
		notify.WithLogger(logger),
	)
	return &notifierService{
		notifier: n,
		from:     from,
		logger:   logger,
	}
}

func (s *notifierService) SendEmail(ctx context.Context, to []string, subject, body string) error {
	s.logger.Info("Sending email", zap.Strings("to", to), zap.String("subject", subject))
	return s.notifier.SendEmail(ctx, notify.Email{
		From:     s.from,
		To:       to,
		Subject:  subject,
		HTMLBody: body,
	})
}

func (s *notifierService) SendPasswordSetupLink(ctx context.Context, email, name, link, mode string) error {
	subject := "Set up your WardSeal password"
	action := "set up your account"
	if mode == "reset" {
		subject = "Reset your WardSeal password"
		action = "reset your password"
	}

	body := fmt.Sprintf(`
		<html>
		<body>
			<p>Hello %s,</p>
			<p>Please click the link below to %s:</p>
			<p><a href="%s">%s</a></p>
			<p>This link will expire in 72 hours.</p>
			<p>If you did not request this, please ignore this email.</p>
			<br/>
			<p>Best regards,<br/>WardSeal Team</p>
		</body>
		</html>
	`, name, action, link, subject)

	return s.SendEmail(ctx, []string{email}, subject, body)
}
