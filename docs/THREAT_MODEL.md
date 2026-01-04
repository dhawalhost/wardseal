# Threat Model

> Implementation status aligned with WardSeal codebase as of 2026-01-03

---

## Authentication Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Credential stuffing | Rate limiting | ✅ Implemented | `middleware.RateLimitMiddleware(20, 40)` |
| Credential stuffing | Account lockout | ✅ Implemented | `login_attempt_store.go` - 5 failures = 15min |
| MFA bypass | Policy enforcement | ⚠️ Partial | TOTP enforced at login if enabled |
| Phishing | Passkeys (WebAuthn) | ✅ Implemented | `webauthn.go`, `webauthn_api.go` |

**Missing:** Per-user MFA policy toggle (currently user self-enrolls)

---

## OAuth Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Token replay | Refresh rotation | ✅ Implemented | `handleRefreshTokenGrant` - deletes old, issues new |
| Redirect abuse | Strict allowlists | ✅ Implemented | `oauth_clients.redirect_uris` validated |
| Authorization code interception | PKCE | ✅ Implemented | S256 code challenge in `service.go` |

---

## Session Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| CSRF | Same-site cookies | ✅ Implemented | `SameSiteStrictMode` in `setAuthCookies` |
| Session fixation | Regeneration on auth | ✅ Implemented | New token on each login |
| XSS | httpOnly cookies | ✅ Implemented | `httpOnly: true` in `setAuthCookies` |
| Logout | Cookie clearing | ✅ Implemented | `/logout` endpoint with `clearAuthCookies` |


---

## Admin Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Privilege escalation | Audit logs | ✅ Implemented | `audit` package, `audit_logs` table |
| Silent config changes | Immutable audit | ✅ Implemented | Append-only audit log with export |
| Account takeover | MFA enforced | ✅ Implemented | TOTP + WebAuthn in login flow |

---

## Platform Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Tenant data leakage | Strict isolation | ✅ Implemented | `X-Tenant-ID` header, all queries filtered |
| Key compromise | KMS + rotation | ❌ Not Implemented | Keys in PEM files |
| Abuse | Rate limits | ✅ Implemented | Token bucket per-IP |
| Abuse | WAF | ❌ Not Implemented | No WAF integration |

**Missing:** KMS integration (HashiCorp Vault / AWS KMS), WAF

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Fully Implemented | 14 |
| ⚠️ Partially Implemented | 1 |
| ❌ Not Implemented | 2 |

---

## Roadmap for Full Alignment

### Medium Priority
1. **MFA Policy** - Admin-configurable per-user/per-org MFA requirements
2. **WAF Integration** - Cloud WAF (Cloudflare/AWS WAF) for production

### Low Priority (Production Deployment)
3. **KMS Integration** - External secrets management for signing keys
