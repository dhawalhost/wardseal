package observability

import (
	"context"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

// TracerConfig holds configuration for the tracer.
type TracerConfig struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	OTLPEndpoint   string // e.g., "localhost:4317" for gRPC
}

// InitTracer initializes the OpenTelemetry tracer provider.
// Returns a shutdown function that should be called on application exit.
func InitTracer(ctx context.Context, cfg TracerConfig, logger *zap.Logger) (func(context.Context) error, error) {
	if cfg.OTLPEndpoint == "" {
		cfg.OTLPEndpoint = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	}
	if cfg.OTLPEndpoint == "" {
		// No endpoint configured, use a no-op tracer
		logger.Info("OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled")
		return func(context.Context) error { return nil }, nil
	}

	// Create OTLP exporter
	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(cfg.OTLPEndpoint),
		otlptracegrpc.WithInsecure(), // For local development; use TLS in production
	)
	if err != nil {
		return nil, err
	}

	// Create resource with service information
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String(cfg.ServiceName),
			semconv.ServiceVersionKey.String(cfg.ServiceVersion),
			semconv.DeploymentEnvironmentKey.String(cfg.Environment),
		),
	)
	if err != nil {
		return nil, err
	}

	// Create tracer provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()), // Sample all traces for now
	)

	// Set global tracer provider
	otel.SetTracerProvider(tp)

	// Set global propagator (W3C Trace Context)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	logger.Info("OpenTelemetry tracing initialized",
		zap.String("service", cfg.ServiceName),
		zap.String("endpoint", cfg.OTLPEndpoint),
	)

	return tp.Shutdown, nil
}

// Tracer returns a tracer for the given name.
func Tracer(name string) trace.Tracer {
	return otel.Tracer(name)
}
