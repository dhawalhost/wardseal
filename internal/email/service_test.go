package email

import (
	"context"
	"strings"
	"testing"

	"github.com/dhawalhost/gokit/notify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestEmailService_MemorySender(t *testing.T) {
	memSender := notify.NewMemorySender()
	logger := zap.NewNop()
	svc := NewServiceWithSender(memSender, "test@wardseal.io", logger)

	ctx := context.Background()

	t.Run("SendEmail delivers via notify.MemorySender", func(t *testing.T) {
		err := svc.SendEmail(ctx, []string{"user@example.com"}, "Welcome", "<p>Hello World</p>")
		require.NoError(t, err)

		emails := memSender.Emails()
		require.Len(t, emails, 1)
		assert.Equal(t, "test@wardseal.io", emails[0].From)
		assert.Equal(t, []string{"user@example.com"}, emails[0].To)
		assert.Equal(t, "Welcome", emails[0].Subject)
		assert.Equal(t, "<p>Hello World</p>", emails[0].HTMLBody)
	})

	t.Run("SendPasswordSetupLink invite mode", func(t *testing.T) {
		memSender.Reset()
		err := svc.SendPasswordSetupLink(ctx, "invitee@example.com", "Alice", "https://app.wardseal.io/setup?token=123", "setup")
		require.NoError(t, err)

		email, found := memSender.FindEmailByTo("invitee@example.com")
		require.True(t, found)
		assert.Equal(t, "Set up your WardSeal password", email.Subject)
		assert.True(t, strings.Contains(email.HTMLBody, "Hello Alice"))
		assert.True(t, strings.Contains(email.HTMLBody, "https://app.wardseal.io/setup?token=123"))
	})

	t.Run("SendPasswordSetupLink reset mode", func(t *testing.T) {
		memSender.Reset()
		err := svc.SendPasswordSetupLink(ctx, "reset@example.com", "Bob", "https://app.wardseal.io/reset?token=abc", "reset")
		require.NoError(t, err)

		email, found := memSender.FindEmailByTo("reset@example.com")
		require.True(t, found)
		assert.Equal(t, "Reset your WardSeal password", email.Subject)
		assert.True(t, strings.Contains(email.HTMLBody, "reset your password"))
	})
}
