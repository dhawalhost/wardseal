# Threat Model

> Implementation status aligned with WardSeal codebase as of 2026-10-11 (Phases A–C remediation).

Canonical route authz expectations: `pkg/routeauthz`. Living audit: `docs/ENTERPRISE_AUDIT_REPORT.md`.

---

## Authentication Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Credential stuffing | Rate limiting | ✅ Implemented | Distributed Redis limiter + login attempt store |
| Credential stuffing | Account lockout | ✅ Implemented | `login_attempt_store.go` — 5 failures = 15min |
| Weak / breached passwords | Policy + Argon2id | ✅ Implemented | `pkg/password` — min 12, complexity, denylist; Argon2id with bcrypt verify+upgrade |
| MFA bypass | Policy enforcement | ✅ Implemented | Enforced for critical roles (Admin) and self-enrolled users |
| Phishing | Passkeys (WebAuthn) | ✅ Implemented | `webauthn.go`, `webauthn_api.go` |
| SCIM API key theft | Bcrypt + scim scope | ✅ Implemented | Bearer-only; JWT needs admin+scim; API key needs scim scope |
| Login open redirect | Allowlist | ✅ Implemented | `web/id` `safeRedirect` |

---

## OAuth / Session Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Token replay | Refresh rotation + hashed refresh at rest | ✅ Implemented | `handleRefreshTokenGrant` + hashed store |
| Redirect abuse | Strict allowlists | ✅ Implemented | OAuth client redirect URIs + login redirect allowlist |
| Auth code interception | PKCE | ✅ Implemented | S256 in `service.go` |
| CSRF | SameSite Strict cookies | ✅ Implemented | `setAuthCookies` |
| XSS token theft | httpOnly + CSP (no script unsafe-inline) | ✅ Implemented | Cookie + `SecurityHeadersMiddleware` |
| Session fixation | New tokens on login | ✅ Implemented | Login issues fresh access token |

---

## Management / Admin Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Unauthenticated management APIs | JWT / service auth | ✅ Implemented | Phase A — developer, RBAC, policy, tenants |
| Auth without authz | `RequirePermission` | ✅ Implemented | Governance, directory users/groups, policy |
| Header identity spoofing | Ignore client identity headers for auth | ✅ Implemented | JWT/`RequireUserAuth` only |
| Privilege escalation | Break-glass + audit | ✅ Implemented | Time-bound elevate + runbook; append-only audit trigger |
| Silent config changes | Immutable audit | ✅ Implemented | DB trigger blocks UPDATE/DELETE on `audit_logs` |
| Service token fail-open | Fatal outside local | ✅ Implemented | Startup guards on empty `SERVICE_AUTH_TOKEN` |

---

## Platform Threats

| Threat | Mitigation | Status | Implementation |
|--------|------------|--------|----------------|
| Tenant data leakage | JWT tenant binding + RLS | ✅ Implemented | Tenant from JWT/service context; queries scoped |
| Key compromise | KMS + rotation | ✅ Implemented | Vault Transit in prod |
| Abuse | Rate limits | ✅ Implemented | Token bucket / Redis distributed |
| Abuse | WAF | ❌ Not Implemented | No WAF integration |
| Webhook SSRF | Redirect deny + outbox/DLQ + DNS checks | ✅ Implemented | `CheckRedirect` deny; all resolved IPs checked; `webhook_deliveries` outbox |
| MCP unauthenticated | API key required outside local | ✅ Implemented | `mcpsvc` + tenant binding for master token |
| Supply chain | Vuln scan + SBOM | ✅ Implemented | `govulncheck`, Dependabot, CycloneDX SBOM artifact |
| Circular graph DoS | MaxDepth | ✅ Implemented | `MaxDepth = 10` in ReBAC engine |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Fully Implemented | 25 |
| ⚠️ Partially Implemented | 0 |
| ❌ Not Implemented | 1 |

---

## Remaining roadmap

1. **External pen test** — follow `docs/runbooks/PEN_TEST.md`; close Critical/High with retest
2. **WAF** — Cloudflare/AWS WAF in front of ingress
3. **Webhook durability** — outbox / DLQ (Phase D)
4. **MFA policy UX** — admin-configurable per-user/org MFA requirements
5. **HIBP online check** (optional) — k-anonymity API behind feature flag; offline denylist already ships
