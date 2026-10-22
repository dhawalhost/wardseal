package redisbus

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRedisBus_InMemoryFallback(t *testing.T) {
	logger := zap.NewNop()
	bus := NewRedisEventBus(nil, logger)
	defer bus.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(1)

	var received []byte
	err := bus.Subscribe(ctx, "user.created", func(_ context.Context, payload []byte) error {
		received = payload
		wg.Done()
		return nil
	})
	require.NoError(t, err)

	expected := []byte(`{"user_id":"u-123","action":"signup"}`)
	err = bus.Publish(ctx, "user.created", expected)
	require.NoError(t, err)

	wg.Wait()
	assert.Equal(t, expected, received)
}
