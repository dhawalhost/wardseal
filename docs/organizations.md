# Organizations Guide

Organizations enable B2B multi-tenancy, allowing your customers (enterprises) to manage their own SSO configurations and users.

## Overview

```
Tenant (Your Company)
├── Organization A (Customer: Acme Corp)
│   ├── SSO: Okta
│   └── Users from acme.com
├── Organization B (Customer: BigCo)
│   ├── SSO: Azure AD
│   └── Users from bigco.com
└── Organization C (Customer: StartupXYZ)
    └── Password-based auth
```

## Creating Organizations

### Via Admin UI

1. Navigate to **🏢 Organizations**
2. Click **+ New Organization**
3. Fill in:
   - **Name**: Unique identifier (e.g., `acme-corp`)
   - **Display Name**: Human-readable name
   - **Domain**: Customer's email domain (e.g., `acme.com`)
4. Click **Create**

### Via API

```bash
curl -X POST http://localhost:8082/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -d '{
    "name": "acme-corp",
    "display_name": "Acme Corporation",
    "domain": "acme.com"
  }'
```

---

## Domain Verification

Verify domain ownership to enable automatic SSO routing.

### Step 1: Generate Verification Token

Click **Verify Domain** in the Organizations table, or:

```bash
curl -X POST http://localhost:8082/api/v1/organizations/{id}/domain-verification/generate \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

**Response:**
```json
{
  "domain": "acme.com",
  "token": "wardseal-verify=a1b2c3d4...",
  "txt_record": "_wardseal.acme.com",
  "instructions": "Add a TXT record..."
}
```

### Step 2: Add DNS TXT Record

Add to your DNS:

| Type | Name | Value |
|------|------|-------|
| TXT | `_wardseal.acme.com` | `wardseal-verify=a1b2c3d4...` |

### Step 3: Verify

Wait for DNS propagation (1-10 minutes), then:

```bash
curl -X POST http://localhost:8082/api/v1/organizations/{id}/domain-verification/verify \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

---

## Organization SSO

Configure SSO so users from an organization's domain are automatically routed to their IdP.

### SAML Configuration

```bash
curl -X POST http://localhost:8080/api/v1/saml/providers \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -d '{
    "name": "Acme SSO",
    "organization_id": "acme-corp-uuid",
    "entity_id": "https://acme.okta.com/...",
    "sso_url": "https://acme.okta.com/sso/saml",
    "certificate": "-----BEGIN CERTIFICATE-----..."
  }'
```

### Login Flow

When a user logs in with `user@acme.com`:
1. WardSeal checks if `acme.com` is verified for an organization
2. If SSO is configured, redirect to IdP
3. User authenticates with their corporate credentials
4. IdP returns SAML assertion to WardSeal
5. WardSeal issues session token

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/organizations` | List organizations |
| POST | `/api/v1/organizations` | Create organization |
| GET | `/api/v1/organizations/:id` | Get organization |
| PUT | `/api/v1/organizations/:id` | Update organization |
| DELETE | `/api/v1/organizations/:id` | Delete organization |
| GET | `/api/v1/organizations/:id/domain-verification` | Get verification status |
| POST | `/api/v1/organizations/:id/domain-verification/generate` | Generate token |
| POST | `/api/v1/organizations/:id/domain-verification/verify` | Verify domain |
