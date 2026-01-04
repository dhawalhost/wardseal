# WardSeal Documentation

Welcome to the WardSeal Identity & Access Management Platform documentation.

## Quick Links

| Guide | Description |
|-------|-------------|
| [Getting Started](./getting-started.md) | Set up and run WardSeal locally |
| [Authentication](./authentication.md) | Login, MFA, SSO, and OAuth2/OIDC |
| [Developer Portal](./developer-portal.md) | Register apps, API keys, and widgets |
| [Organizations](./organizations.md) | Multi-tenant B2B features |
| [Admin Console](./admin-console.md) | User management and policies |
| [API Reference](./api-reference.md) | Complete API documentation |
| [Security](./security.md) | Security features and best practices |
| [Deployment](./deployment.md) | Production deployment guide |

## Architecture Overview

WardSeal is a microservices-based identity platform with three core services:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Nginx                       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   authsvc   │      │   dirsvc    │      │   govsvc    │
│   :8080     │      │   :8081     │      │   :8082     │
│             │      │             │      │             │
│ • OAuth2    │      │ • Identities│      │ • Policies  │
│ • OIDC      │      │ • SCIM 2.0  │      │ • Audit     │
│ • SAML SSO  │      │ • Groups    │      │ • Orgs      │
│ • MFA       │      │             │      │ • Roles     │
└─────────────┘      └─────────────┘      └─────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   :5432         │
                    └─────────────────┘
```

## Features

### Authentication
- Username/Password login
- Multi-Factor Authentication (TOTP, WebAuthn)
- Social Login (Google, GitHub, etc.)
- SAML 2.0 SSO
- OAuth 2.0 / OpenID Connect

### Developer Experience
- Self-service app registration
- API key management
- Embeddable login widget
- Comprehensive API docs

### Enterprise
- Multi-tenant architecture
- Organizations (for B2B)
- Domain verification
- SCIM 2.0 provisioning
- Audit logging

### Security
- Brute-force protection
- Rate limiting
- httpOnly secure cookies
- PKCE for OAuth flows
- Refresh token rotation

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: This docs folder
- **API Explorer**: `/developer` in Admin UI
