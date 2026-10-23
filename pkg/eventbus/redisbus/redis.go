package redisbus

import (
	"context"

	gokitbus "github.com/dhawalhost/gokit/eventbus"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/dhawalhost/wardseal/pkg/eventbus"
)

// redisBus implements eventbus.EventBus using gokit/eventbus backed by Redis Streams.
type redisBus struct {
	bus    gokitbus.Bus
	logger *zap.Logger
}

// NewRedisEventBus creates a new EventBus backed by Redis Streams (or MemoryBus if client is nil).
func NewRedisEventBus(client redis.UniversalClient, logger *zap.Logger) eventbus.EventBus {
	if client == nil {
		logger.Warn("Redis client is nil, using in-memory event bus")
		return &redisBus{
			bus:    gokitbus.NewMemoryBus(),
			logger: logger,
		}
	}

	rb, err := gokitbus.NewRedisBus(gokitbus.RedisBusConfig{
		Client:       client,
		StreamPrefix: "events:",
		DefaultGroup: "wardseal-workers",
	})
	if err != nil {
		logger.Error("failed to create redis streams bus, falling back to in-memory bus", zap.Error(err))
		return &redisBus{
			bus:    gokitbus.NewMemoryBus(),
			logger: logger,
		}
	}

	return &redisBus{
		bus:    rb,
		logger: logger,
	}
}

// Publish sends an event to the topic.
func (r *redisBus) Publish(ctx context.Context, topic string, payload []byte) error {
	msg := gokitbus.NewMessage(topic, payload)
	return r.bus.Publish(ctx, msg)
}

// Subscribe registers a handler to consume events from the given topic.
func (r *redisBus) Subscribe(ctx context.Context, topic string, handler eventbus.Handler) error {
	_, err := r.bus.Subscribe(ctx, topic, func(ctx context.Context, msg *gokitbus.Message) error {
		return handler(ctx, msg.Payload)
	})
	return err
}

// Close gracefully terminates subscriptions and connections.
func (r *redisBus) Close() error {
	return r.bus.Close()
}
