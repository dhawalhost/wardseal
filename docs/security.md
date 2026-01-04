# Security Guide

WardSeal implements industry-standard security controls to protect your identity data.

## Security Features

### ✅ Authentication Security

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with cost factor 10 |
| MFA | TOTP (RFC 6238) + WebAuthn |
| Brute Force Protection | Account lockout after 5 failed attempts |
| Session Security | httpOnly cookies, SameSite=Strict |

### ✅ OAuth 2.0 Security

| Feature | Implementation |
|---------|----------------|
| PKCE | S256 code challenge |
| Token Rotation | Refresh tokens rotated on use |
| Token Revocation | Immediate invalidation |
| Redirect Validation | Strict URI allowlists |

### ✅ API Security

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | 20 req/s per IP |
| Security Headers | HSTS, CSP, X-Frame-Options |
| Input Validation | Parameterized queries |
| Multi-Tenancy | X-Tenant-ID isolation |

---

## Brute Force Protection

Failed login attempts are tracked per user:

| Threshold | Action |
|-----------|--------|
| 5 failures in 15 min | Account locked for 15 min |
| Successful login | Counter reset, lockout cleared |

**Locked response:**
```json
{
  "error": "account_locked",
  "locked_until": "2026-01-03T18:00:00Z"
}
```

---

## Token Security

### Access Tokens
- JWT format (RS256 signed)
- 1 hour expiry
- Contains: tenant_id, subject, scope

### Refresh Tokens
- Opaque string
- 7 day expiry
- Rotated on each use (old token invalidated)

### httpOnly Cookies

Tokens are also set as secure cookies:

```
wardseal_access_token=...; HttpOnly; SameSite=Strict; Path=/
wardseal_refresh_token=...; HttpOnly; SameSite=Strict; Path=/oauth2/token
```

---

## Multi-Tenant Isolation

All API requests require `X-Tenant-ID` header. Data access is filtered:

```sql
SELECT * FROM users WHERE tenant_id = $1 AND id = $2
```

Cross-tenant access is impossible by design.

---

## Security Headers

Applied to all responses:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## SAML Security

- Signatures required on assertions
- Encrypted SAML responses supported
- Certificate pinning available

---

## Best Practices

### For Production

1. **Enable HTTPS** - Required for secure cookies
2. **Set `ENVIRONMENT=production`** - Enables secure cookie flags
3. **Use strong secrets** - 256-bit minimum for JWT keys
4. **Monitor audit logs** - Review `/api/v1/audit-logs` regularly
5. **Enable MFA** - Encourage or enforce for all users

### For Developers

1. **Use PKCE** - Always for public clients
2. **Validate redirect URIs** - Exact match only
3. **Store tokens securely** - Use httpOnly cookies when possible
4. **Implement token refresh** - Handle token expiry gracefully
5. **Log security events** - Use webhooks for real-time alerts

---

## Incident Response

### Suspicious Activity

Check audit logs for:
- Multiple failed logins from same IP
- Login from unusual location
- Privilege escalation attempts

### Account Compromise

1. Revoke all tokens: `POST /oauth2/revoke`
2. Reset password via admin API
3. Force re-enrollment of MFA
4. Review audit logs for unauthorized access

### API Key Compromise

1. Revoke immediately: `DELETE /api/v1/api-keys/:id`
2. Rotate affected secrets
3. Review API logs for misuse
