# Enterprise License Management

This guide explains how to generate and verify licenses for self-hosted enterprise customers.

## Overview

Self-hosted instances of WardSeal verify a signed JWT license key at startup. This key contains the customer name, expiry date, and enabled features.

## Prerequisites

You need the **private key** (`private.pem`) to generate licenses. This key must strictly be kept within the vendor organization.

## Generating a License

Use the `licensegen` tool to issue new keys.

### 1. Build the Tool

```bash
go build -o bin/licensegen ./cmd/tools/licensegen
```

### 2. Generate a Key Generation Keypair (First Time Only)

If you don't have a keypair yet:

```bash
./bin/licensegen -gen-key
# Outputs private.pem and public.pem
```

- **private.pem**: KEEP SECRET. Used to sign licenses.
- **public.pem**: Distribute to customers. Used to verify licenses.

### 3. Issue a License

```bash
./bin/licensegen \
  -customer "Acme Corp" \
  -days 365 \
  -plan "enterprise" \
  -features "sso,mfa,audit,scim" \
  -key private.pem
```

**Output:**
```
License Key for Acme Corp:

eyJhbGciOiJSUzI1NiIs... (The License Key)

Expires: 04 Jan 27 18:00 UTC
```

## Customer Deployment

To enable enterprise features, the customer must run `authsvc` with:

1. **`REQUIRE_LICENSE=true`**
2. **`LICENSE_PUBLIC_KEY_PATH=/path/to/public.pem`** (Simulated via config map or file mount)
3. **`LICENSE_KEY=eyJ...`** (The key you generated)

If the license is invalid or expired, the service will fail to start.
