# Environment Variables Configuration

This document describes all environment variables required for the Identity Platform services and CI/CD pipeline.

## CircleCI Contexts

### `ghcr` Context (GitHub Container Registry)
Create in CircleCI → Organization Settings → Contexts

| Variable | Required | Description |
| :--- | :---: | :--- |
| `GHCR_USERNAME` | ✅ | GitHub username |
| `GHCR_TOKEN` | ✅ | GitHub Personal Access Token with `write:packages` scope |
| `GHCR_OWNER` | ✅ | GitHub org/username for image prefix (e.g., `dhawalhost`) |

---

## Integration Test Environment Variables

These are automatically set by CircleCI for the `integration-test` job, but listed here for local testing:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `TEST_DB_HOST` | `localhost` | PostgreSQL host for integration tests |
| `TEST_DB_PORT` | `5432` | PostgreSQL port |
| `TEST_DB_USER` | `user` | Test database username |
| `TEST_DB_PASSWORD` | `password` | Test database password |
| `TEST_DB_NAME` | `identity_platform_test` | Test database name |

### Running Integration Tests Locally

```bash
# Start PostgreSQL (using docker-compose)
docker-compose up -d postgres

# Create test database
psql -h localhost -U user -d postgres -c "CREATE DATABASE identity_platform_test;"

# Run migrations on test database
./scripts/migrate/migrate -path migrations \
  -database "postgres://user:password@localhost:5432/identity_platform_test?sslmode=disable" up

# Run integration tests
TEST_DB_HOST=localhost \
TEST_DB_USER=user \
TEST_DB_PASSWORD=password \
TEST_DB_NAME=identity_platform_test \
go test -v -tags=integration ./tests/integration/...
```

## Service Environment Variables

### Database Configuration (All Services)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DB_HOST` | ❌ | `localhost` | PostgreSQL host |
| `DB_PORT` | ❌ | `5432` | PostgreSQL port |
| `DB_USER` | ❌ | `user` | Database username |
| `DB_PASSWORD` | ❌ | `password` | Database password |
| `DB_NAME` | ❌ | `identity_platform` | Database name |
| `DB_SSLMODE` | ❌ | `disable` | SSL mode: `disable`, `require`, `verify-full` |

---

### Auth Service (`authsvc`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `AUTH_SERVICE_URL` | ❌ | `http://localhost:8080` | Base URL for auth service |
| `DIRECTORY_SERVICE_URL` | ❌ | `http://dirsvc:8081` | URL of directory service |
| `SERVICE_AUTH_TOKEN` | ⚠️ | `dev-internal-token` | Token for service-to-service auth |
| `SERVICE_AUTH_HEADER` | ❌ | - | Custom header name for service auth |
| `JWT_SIGNING_KEY` | ✅ | - | Private key for signing JWTs |
| `JWT_PUBLIC_KEY` | ❌ | - | Public key for verifying JWTs |
| `LOG_LEVEL` | ❌ | `info` | Logging level: `debug`, `info`, `warn`, `error` |

#### Enterprise License (Optional)
| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `REQUIRE_LICENSE` | ❌ | `false` | Set to `true` to enable license check |
| `LICENSE_KEY` | ⚠️ | - | Enterprise license key (required if REQUIRE_LICENSE=true) |
| `LICENSE_PUBLIC_KEY_PATH` | ❌ | `/etc/wardseal/license_public.pem` | Path to license public key |

---

### Directory Service (`dirsvc`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `SERVICE_AUTH_TOKEN` | ⚠️ | `dev-internal-token` | Token for service-to-service auth |
| `SERVICE_AUTH_HEADER` | ❌ | - | Custom header name for service auth |

---

### Governance Service (`govsvc`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DIRECTORY_SERVICE_URL` | ❌ | `http://dirsvc:8081` | URL of directory service |
| `WEBHOOK_SECRET` | ⚠️ | - | Secret for signing webhooks |

---

### Observability (All Services)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ❌ | - | OpenTelemetry collector endpoint |
| `OTEL_SERVICE_NAME` | ❌ | - | Service name for tracing |

---

## Production Recommendations

> [!CAUTION]
> Never use default values in production!

1. **Generate strong secrets:**
   ```bash
   # Generate JWT signing key
   openssl genpkey -algorithm RSA -out jwt_private.pem -pkeyopt rsa_keygen_bits:2048
   openssl rsa -pubout -in jwt_private.pem -out jwt_public.pem
   
   # Generate random tokens
   openssl rand -hex 32
   ```

2. **Use secrets management:**
   - Kubernetes: Use Secrets or external secrets operator
   - CircleCI: Use Contexts for sensitive values
   - Production: Consider HashiCorp Vault or AWS Secrets Manager

3. **Enable SSL for database:**
   - Set `DB_SSLMODE=verify-full` in production
