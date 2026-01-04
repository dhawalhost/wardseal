# Getting Started

This guide will help you set up and run WardSeal locally in under 5 minutes.

## Prerequisites

- **Go 1.21+**: [Install Go](https://golang.org/doc/install)
- **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 18+**: [Install Node.js](https://nodejs.org/) (for Admin UI)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/wardseal.git
cd wardseal
```

### 2. Start Infrastructure & Run Services

```bash
./scripts/run_local.sh
```

This script:
- Starts PostgreSQL and Redis containers
- Applies database migrations
- Starts authsvc (port 8080), dirsvc (port 8081), govsvc (port 8082)
- Starts the Admin UI (port 5173)

### 3. Access the Admin UI

Open [http://localhost:5173](http://localhost:5173) and login with:

| Field | Value |
|-------|-------|
| Email | `admin@wardseal.com` |
| Password | `password123` |
| Tenant ID | `11111111-1111-1111-1111-111111111111` |

## Project Structure

```
wardseal/
├── cmd/
│   ├── authsvc/        # Authentication service
│   ├── dirsvc/         # Directory service
│   └── govsvc/         # Governance service
├── internal/
│   ├── auth/           # OAuth2, OIDC, MFA, SSO
│   ├── directory/      # Identity CRUD
│   ├── governance/     # Access requests, policies
│   └── scim/           # SCIM 2.0 provisioning
├── migrations/         # Database migrations
├── web/
│   ├── admin/          # React Admin UI
│   └── widget/         # Embeddable login widget
├── docs/               # Documentation
└── scripts/            # Helper scripts
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `user` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `identity_platform` |
| `ENVIRONMENT` | `development` or `production` | `development` |

### Ports

| Service | Port |
|---------|------|
| authsvc | 8080 |
| dirsvc | 8081 |
| govsvc | 8082 |
| Admin UI | 5173 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## Next Steps

- [Authentication Guide](./authentication.md) - Set up login, MFA, and SSO
- [Developer Portal Guide](./developer-portal.md) - Register OAuth apps
- [API Reference](./api-reference.md) - Explore the APIs
