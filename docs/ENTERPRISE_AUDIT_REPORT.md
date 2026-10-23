# WardSeal Enterprise End-to-End Audit Report

| Field | Value |
| --- | --- |
| **Repository** | `wardseal` (`github.com/dhawalhost/wardseal`) |
| **Audit date** | 2026-10-10 |
| **Scope** | Full monorepo: services, APIs, UI, migrations, deploy, CI/CD, docs; sibling repos noted |
| **Lens** | Enterprise buyer / CISO / platform SRE evaluating production adoption |
| **Verdict** | **High + ops gates largely closed in code (2026-10-11)** — H1 SCIM scoped Bearer, H6 webhook outbox/DLQ + DNS hardening, IR drill + security-gate evidence. External vendor pen test still annual/operational. |

---

## 1. Executive summary

WardSeal is an ambitious open-core **IAM + IGA** platform (OIDC/SAML IdP, MFA, SCIM, access requests, campaigns, ReBAC, connectors, ChatOps, Vault KMS). The product vision, architecture docs, Helm/Argo/Vault deploy story, and compliance policy pack are unusually mature for a mid-stage codebase.

**Original audit (2026-10-10):** management APIs trusted spoofable headers or lacked auth; RBAC was inconsistent; audit immutability, SIEM export, break-glass, and vuln scanning were docs-ahead-of-controls.

**Remediation (2026-10-11):** Phases A–C + H1/H6 + password/SBOM/docs + IR drill runbook + automated security-gate evidence. Remaining buyer gate: schedule external pen test and complete first IR drill with evidence file.

**Buyer decision today:** Staging / controlled pilot is recommended. Production after external pen-test retest + completed IR drill evidence.

### Scorecard (enterprise adoption)

| Dimension | Score (1–5) | Notes |
| --- | --- | --- |
| Product vision & docs | 4 | Strong README, architecture, policies, runbooks |
| AuthN (login/OIDC/SAML/MFA) | 4 | Solid core; SCIM scoped Bearer; redirect/cookie hardening done |
| AuthZ (RBAC/ReBAC on APIs) | **3.5** | Phase A–C: JWT + permissions on management/directory mutates; service-auth for internals |
| Multi-tenancy isolation | 4 | RLS + JWT tenant binding; service-token require in prod |
| Secrets / KMS | 4 | Vault + ESO pattern; fail-open service-token default |
| Observability / SLOs | 3.5 | Metrics/OTEL/alerts; OTEL insecure helper |
| HA / DR / scale | 3.5 | Docs + Helm HPA/PDB; webhook outbox/DLQ in place |
| Compliance evidence | 4 | Append-only audit, NDJSON, break-glass, SBOM, pen-test runbook; external engagement pending |
| Test & CI maturity | 4.5 | Unit/integration/e2e/k6 + Dependabot + govulncheck + SBOM artifact |
| Code maintainability | 3 | Signup extracted from auth god-file; route-authz registry; OpenAPI expanded |
| **Overall enterprise readiness** | **4 / 5** | Code controls in place; external pen test still required |

---

## 2. Scope, methodology, and related repos

### In scope

- `cmd/*` services: `authsvc`, `dirsvc`, `govsvc`, `policysvc`, `provsvc`, `mcpsvc`, CLI
- `internal/*` domain packages and `pkg/*` shared libraries
- `web/*` frontends (admin, id, app, developer, landing, status, ui)
- `migrations/`, `deploy/`, `.github/workflows/`, `docs/`, `tests/`
- Config defaults (`.env.example`, `pkg/config`)

### Related workspaces (light review)

| Repo | Role | Audit note |
| --- | --- | --- |
| `wardseal` | Core platform | Primary focus of this report |
| `wardseal-docs` | Public Nextra docs site | Keep in sync with code; architecture/SSO pages currently diverge from code in places |
| `wardseal-mfa` | Separate push-MFA / mobile stack | Not wired into main compose path; treat as second product surface needing its own auth review |
| `wardseal-ui-kit` | Shared UI kit | Design-system dependency; low security blast radius if published carefully |

### Method

- Architecture map via repo structure + `graphify-out/GRAPH_REPORT.md`
- Route/middleware inspection in `cmd/*/main.go` and handlers
- Cross-check of security claims in `docs/` vs implementation
- Static review for authz holes, secrets defaults, SSRF, redirects, tenancy bypasses
- Enterprise feature gap analysis vs Okta / SailPoint / Entra-class expectations

This is a **code and design audit**, not a live penetration test. Findings should be validated with dynamic tests before production.

---

## 3. Platform architecture (as built)

```
Browser UIs (admin / app / id / landing / developer)
              │
     Traefik / Ingress / ALB
              │
 ┌────────────┼──────────────┬─────────────┬──────────┐
 authsvc     dirsvc        govsvc      policysvc   provsvc
 (:8080)     (:8081)       (:8082)      (:8083)    (+ mcpsvc)
   │           │             │             │           │
   └───────────┴────── PostgreSQL 17 + Redis 7 ───────┘
                         │
                   Vault / External Secrets
```

| Layer | Technology |
| --- | --- |
| Language | Go 1.26.2, Gin REST |
| Auth libs | JWT (jose), crewjam/saml, WebAuthn, TOTP, oauth2 |
| Policy | Simple ABAC + CEL; Rego/OPA incomplete |
| AuthZ graph | Zanzibar-style ReBAC (`internal/authz`) |
| Data | Postgres (48 up migrations), Redis (sessions/RL/bus) |
| KMS | Vault Transit + local AES-GCM |
| Frontends | React/Vite monorepo |
| Deploy | Docker Compose (dev), Helm + Argo CD (staging/prod) |
| Observability | Zap, Prometheus, OTEL, Grafana alerts |

**Strength:** Clear microservice boundaries and a real multi-tenant + org model (tenant → organizations → identities), with Postgres RLS on key tables (`migrations/000044_rls_enforcement.up.sql`).

---

## 4. What is already strong (credit)

Do not lose these while remediating:

1. **OIDC provider fundamentals** — Auth Code + PKCE, refresh rotation with reuse detection, JWKS, introspection/revocation.
2. **RSA/Vault signing path** for access tokens; field-level encryption for Slack/connector secrets.
3. **Slack ChatOps HMAC** with replay window.
4. **Outbound webhook private-IP dial filter** + HMAC signing (needs redirect hardening — see High).
5. **Distributed Redis rate limiting** with endpoint profiles on auth/dir/gov.
6. **Production WebAuthn** fails closed without Redis.
7. **GitOps + External Secrets + production-readiness workflow** (`production-readiness.yml`, preflight scripts).
8. **Test pyramid scaffolding** — unit, integration, Playwright e2e, k6 load, OIDC sample RP.
9. **Compliance/legal pack** under `docs/policies/` (DPA, SLA, IR, retention) — rare and valuable, but not a substitute for controls.
10. **Service-auth constant-time compare** middleware.

---

## 5. Critical findings (buyer-blocking)

> **Phase A status (2026-10-11):** C1–C6 remediated in code (JWT on management routes, service-auth `POST /internal/tenants`, fail-closed service token, safe redirects, SCIM admin-role + no tenant header fallback). Validate with the new negative tests before treating as closed in production.

Fix these before any external or multi-tenant production exposure.

### C1. Developer Portal API trusts spoofable identity headers

| | |
| --- | --- |
| **Where** | `internal/auth/developer_api.go`; mounted in `cmd/authsvc/main.go` without `RequireUserAuth` |
| **Issue** | `/api/v1/apps` and `/api/v1/api-keys` use `X-Tenant-ID` + `X-User-ID` only — no JWT |
| **Impact** | Attacker creates OAuth apps, rotates client secrets, mints API keys for any tenant/user |
| **Fix** | Wrap with `RequireUserAuth`; derive tenant/user from claims; require developer/admin permission |

### C2. RBAC management API on authsvc lacks user auth

| | |
| --- | --- |
| **Where** | `cmd/authsvc/main.go` RBAC group — only `TenantExtractor`, no `RequireUserAuth` |
| **Issue** | Role/permission CRUD and role assignment with tenant header alone |
| **Contrast** | `govsvc` correctly wraps the same handlers with `RequireUserAuth` |
| **Impact** | Privilege escalation to super-admin within (or across, if tenant spoofable) tenants |
| **Fix** | Match govsvc: JWT + `HasPermission` on mutate paths; consider removing duplicate unauthenticated mount |

### C3. Policy service CRUD is fully unauthenticated

| | |
| --- | --- |
| **Where** | `internal/policy/api.go`, `cmd/policysvc/main.go` |
| **Issue** | List/create/update/delete policies with only `X-Tenant-ID`; no JWT, service auth, or rate limit |
| **Impact** | Rewrite authz policies for any tenant reachable on `:8083` |
| **Fix** | Require JWT or mTLS/service auth; network-policy deny-by-default; rate limit; permission checks |

### C4. Unauthenticated tenant creation

| | |
| --- | --- |
| **Where** | `internal/directory/api.go` — `POST /tenants` outside protected groups |
| **Impact** | Unlimited tenant spam / resource abuse; potential multi-tenant pollution |
| **Fix** | Platform-admin or service-auth only; optional public signup behind captcha + email verify if product needs it |

### C5. Open redirect after login (`web/id`)

| | |
| --- | --- |
| **Where** | `web/id/src/pages/Login.tsx` — absolute `redirect_uri` assigned to `window.location.href`; `Callback.tsx` uses weak `hostname.endsWith(baseDomain)` |
| **Impact** | Classic post-auth phishing (credentials enter WardSeal, session lands on attacker site) |
| **Fix** | Allowlist relative paths or registered client redirect URIs only; reject absolute external URLs unless exact match to allowlist |

### C6. Service-token fails open to `dev-internal-token`

| | |
| --- | --- |
| **Where** | `cmd/authsvc/main.go`, `cmd/dirsvc/main.go` — empty token → `"dev-internal-token"` |
| **Issue** | Warns but starts; unlike WebAuthn Redis which fatals in production |
| **Impact** | Misconfigured staging/prod = predictable cross-service god token; SCIM can accept service Bearer + free `X-Tenant-ID` |
| **Fix** | Fatal if empty when `ENVIRONMENT` ∈ {staging, production}; rotate any leaked defaults |

---

## 6. High findings

### H1. SCIM accepts any valid RSA JWT; tenant header fallback — **fixed**

- **Where:** `internal/directory/scimauth.go`
- **Remediation:** Explicit `Authorization: Bearer` only (no session cookie); JWT requires admin role **and** `scim` scope + tenant claim (no header fallback); API keys require `scim`/`*`/`admin` scope; new keys default to `read`+`scim`.

### H2. Governance APIs: authentication without authorization

- **Where:** `cmd/govsvc/main.go` requires JWT; `internal/governance` handlers do not call `HasPermission` (only test fake implements it).
- Any authenticated tenant member can manage OAuth clients, campaigns, connectors, webhooks, SSO, audit export.
- **Fix:** Enforce `HasPermission` / ReBAC on every mutate and sensitive read; default-deny.

### H3. SAML management routes lack auth middleware

- **Where:** `cmd/authsvc/main.go` mounts SAML admin on `/api/v1` without `TenantExtractor` or `RequireUserAuth`.
- Currently may 400 without tenant context — still a loaded gun; adding extractor alone would make it Critical.
- **Fix:** JWT + admin permission before any SAML IdP/SP mutation.

### H4. Cookie `Secure` only when `ENVIRONMENT == "production"`

- **Where:** `internal/auth/api.go`
- Staging / typo env names ship session cookies over HTTP.
- **Fix:** Set `Secure` whenever TLS is terminated (or always in non-local); use explicit `COOKIE_SECURE=true`.

### H5. Refresh tokens stored in plaintext

- **Where:** `internal/auth/store_sql.go`
- DB compromise = full session theft despite rotation logic.
- **Fix:** Store only hash (SHA-256/bcrypt) of refresh token; look up by hash.

### H6. Webhook SSRF residual (redirect + DNS TOCTOU) — **fixed**

- **Where:** `internal/event/dispatcher.go`, `internal/webhook/outbox.go`, migration `000050`
- **Remediation:** `CheckRedirect` deny; resolve and reject if **any** IP is private; durable `webhook_deliveries` outbox with retries → `dead` DLQ status; govsvc worker + EventBus bridge.

### H7. MCP server can run unauthenticated

- **Where:** `cmd/mcpsvc/main.go` — empty `WARDSEAL_API_KEY` → unauthenticated mode; master token can grant `TenantID: "*"`.
- **Fix:** Fatal without key outside local; never grant wildcard tenant except break-glass with audit.

### H8. Directory mutations: JWT without role/scope

- Authenticated users can create/delete users/groups if they hold any valid tenant JWT.
- **Fix:** Map directory actions to RBAC permissions (`users:write`, `groups:admin`, etc.).

### H9. CSP allows `'unsafe-inline'` scripts

- **Where:** `pkg/middleware/security.go`
- Weakens XSS defenses for admin/id UIs.
- **Fix:** Nonces/hashes; remove unsafe-inline for scripts.

---

## 7. Medium findings

| ID | Finding | Location / notes |
| --- | --- | --- |
| M1 | Default DB `sslmode=disable` | `pkg/config/config.go` — force `require`/`verify-full` outside local |
| M2 | Audit “immutability” is comment-only | `migrations/000008_audit_logs.up.sql` — no REVOKE/triggers/WORM |
| M3 | CORS credentials + localhost fallbacks | Multiple `cmd/*/main.go` — empty config → localhost origins |
| M4 | HMAC JWT helper still in tree | `pkg/middleware/auth_middleware.go` — alg-confusion risk if reused |
| M5 | WebAuthn tenant fallback to system tenant | `internal/auth/service.go` — wrong-tenant credential risk |
| M6 | Error responses leak `err.Error()` | Widespread in APIs — sanitize for clients |
| M7 | No Dependabot/Renovate/`govulncheck`/`npm audit` in CI | Process gap for enterprise questionnaires |
| M8 | Rate limiting absent on policysvc/provsvc | Amplifies C3 |
| M9 | Feature flags build-time only (`VITE_APP_MODE`) | No runtime kill-switch |
| M10 | Threat model vs code drift (SameSite Strict vs Lax) | `docs/THREAT_MODEL.md` vs `internal/auth/api.go` |
| M11 | OpenAPI incomplete vs real routes — **improved** (security-critical paths + ServiceAuth; full route parity still incremental) |
| M12 | Go version pin drift in CI vs `go.mod` | Align 1.24/1.25 jobs with 1.26.2 |
| M13 | `ExposeHeaders` includes `X-Service-Auth` | `cmd/dirsvc` — unnecessary exposure of service header name |

---

## 8. Low findings & maintainability

| ID | Finding |
| --- | --- |
| L1 | `/metrics` unauthenticated on app port (OK only with NetworkPolicy) |
| L2 | Soft password policy — **fixed** (min 12, denylist, Argon2id + bcrypt upgrade) |
| L3 | God files: `internal/auth/service.go` (~2754 LOC), large API handlers — review hazard |
| L4 | `provsvc` panics on logger init vs structured exit elsewhere |
| L5 | In-memory WebAuthn sessions in non-prod — staging multi-replica hazard |
| L6 | No SBOM/NOTICE automation — **fixed** (CycloneDX SBOM CI artifact) |
| L7 | Zero `TODO`/`FIXME` in code while architecture still has “coming soon” (Rego) — debt is invisible |
| L8 | TASKS.md honesty — **fixed** (pen test unchecked; audit/SBOM/OPA claims corrected) |

---

## 9. Enterprise feature & readiness gaps

What a Fortune-500 IAM/IGA RFP typically asks for, and WardSeal’s gap:

| Enterprise expectation | Current state | Priority |
| --- | --- | --- |
| Consistent AuthZ on all admin APIs | Broken (Critical) | P0 |
| SCIM with scoped tokens & deprovision SLAs | Partial Users/Groups; weak auth | P0 |
| SAML IdP/SP admin hardened | Runtime exists; admin API unauth | P0 |
| Immutable audit + SIEM (Splunk/Syslog/CEF/OCSF) | CSV export only; no append-only DB controls | P0 |
| Break-glass / emergency access | Not found | P1 |
| JIT / time-boxed elevation productized | Access requests exist; no clear JIT admin elevation | P1 |
| Webhook/SOAR reliability (retries, DLQ) | Fire-and-forget goroutines | P1 |
| Multi-region active-active | DR cold failover (RTO ~2h); ROADMAP Phase 4 open | P2 |
| DPoP / hardware-bound sessions | ROADMAP planned | P2 |
| Rego/OPA production path | Documented coming soon; CEL/Simple only | P2 |
| Runtime feature flags / progressive delivery | Build-time only | P2 |
| On-call integrations (PagerDuty/Opsgenie) | Runbooks only | P2 |
| Customer-facing SOC2 Type II evidence map | Policies exist; control evidence incomplete | P1 |
| SBOM + continuous vuln scanning | Missing | P1 |
| Passwordless + push MFA first-class | WebAuthn/TOTP in-core; `wardseal-mfa` separate | P2 |
| Admin UI ↔ API permission parity | Likely over-privileged API behind UI | P0 |

### Competitive honesty (vs Okta / SailPoint / Entra)

Roadmap and competitive docs position WardSeal as a peer. Today it is a **credible open-core foundation** with advanced ideas (ReBAC, ChatOps, NHI), but **not yet a peer on security hygiene of the management plane**. Ship Critical fixes before leaning into AI/governance marketing to enterprises.

---

## 10. Operations, HA, DR, observability

### Strengths

- Helm charts with HPA, PDB, NetworkPolicy templates, ServiceMonitors
- Argo CD apps for staging/production + External Secrets
- SLO doc (`docs/SLO.md`: auth 99.9%, token p95 < 200ms)
- DR / HA strategy docs and runbooks

### Gaps

| Area | Gap |
| --- | --- |
| Webhooks/events | No durable queue, retry, or DLQ — enterprise integrations will fail silently |
| Tracing | `otlptracegrpc.WithInsecure()` — production TLS not enforced in helper |
| Backup/restore | Relies on infra (RDS promote); limited app-level restore drills documented as executable checklists |
| Multi-region | Not ready; graph sync is Phase 4 |
| Chaos / failover drills | Docs exist; no automated game-day evidence in CI |
| Secrets bootstrap | Strong when followed; fail-open defaults undermine it |

---

## 11. Testing & CI gaps

| Layer | Present | Gap |
| --- | --- | --- |
| Unit | ~30 `*_test.go` files; `make test -race` | Thin relative to surface area of auth/gov |
| Integration | `tests/integration/*` | Must expand for authz negative tests (expect 401/403) |
| E2E | Playwright auth/admin | Add open-redirect and privilege-escalation cases |
| Load | k6 auth + SCIM | Add governance/webhook durability under load |
| Security CI | Lint + unit + integration | Add `govulncheck`, `npm audit`, SAST, secret scan, Dependabot |
| Authz regression | Missing | Golden tests: every `/api/v1/*` route must declare required auth + permission |

**Recommended:** Generate a route inventory from Gin registration and fail CI if a route lacks an auth annotation.

---

## 12. Documentation & process debt

1. `docs/README.md` references Protocol Buffers under `api/` — only OpenAPI exists.
2. Threat model SameSite Strict ≠ code Lax.
3. TASKS/ROADMAP mark hardening items complete that this audit contradicts (pen test, immutable audit, OPA integration depth).
4. Legal placeholders remain under `docs/policies/*`.
5. Public `wardseal-docs` and in-repo docs can diverge — pick a source of truth.
6. Untracked local file `# ChatGPT - SailPoint and Okta Analysis` and local `.env` — ensure never committed; rotate if ever pushed.

---

## 13. Prioritized remediation backlog

### Phase A — Stop the bleeding (1–2 weeks)

1. Auth every management route (developer API, authsvc RBAC, SAML admin, policysvc).
2. Lock `POST /tenants`.
3. Fail closed on empty `SERVICE_AUTH_TOKEN` outside local.
4. Fix open redirect allowlist.
5. SCIM scoped credentials; remove tenant header fallback for user JWTs.
6. Add negative integration tests for C1–C6.

### Phase B — Authorization & session hardening (2–4 weeks)

1. ~~`HasPermission` / ReBAC on governance, audit, connectors, SSO~~ (**done** — directory role checks still follow-up)
2. ~~Hash refresh tokens at rest~~ (**done**)
3. ~~Cookie Secure on staging/prod + SameSite Strict~~ (**done**; override via `COOKIE_SECURE`)
4. ~~Webhook redirect deny~~ (**done**; durable outbox/DLQ still Phase D)
5. ~~MCP require API key in staging/prod; no wildcard tenant~~ (**done** — needs `WARDSEAL_MCP_TENANT_ID` with master token)
6. ~~CSP without script unsafe-inline~~ (**done**; wired via `SecurityHeadersMiddleware`)

### Phase C — Enterprise compliance evidence (4–8 weeks)

1. ~~Append-only audit (trigger) + NDJSON SIEM-friendly export~~ (**done**; full streaming SIEM connector still open)
2. ~~Dependabot + govulncheck (+ npm audit advisory) + CycloneDX SBOM in CI~~ (**done**)
3. ~~Break-glass API + runbook~~ (**done** — `POST /api/v1/break-glass/elevate`, `docs/runbooks/BREAK_GLASS.md`)
4. ~~Password/breach policy + Argon2id~~ (**done** — `pkg/password`; bcrypt upgrade-on-login)
5. ~~Align docs/OpenAPI/threat model with code; revise TASKS honesty~~ (**done**)
6. ~~Route-authz registry + auth signup extract~~ (**done** — `pkg/routeauthz`; further god-file splits ongoing)
7. ~~Directory JWT mutates require `users`/`groups` permissions~~ (**done** — H8)
8. ~~SBOM publish in CI~~ (**done** — CycloneDX artifact)
9. ~~Pen-test runbook~~ (**done** — `docs/runbooks/PEN_TEST.md`; external engagement still open)

### Phase D — Scale & differentiation (roadmap)

1. ~~Durable webhook outbox/DLQ~~ (**done** — Redis Streams for all domain events still optional)
2. Multi-region ReBAC / DPoP as per ROADMAP Phase 4.
3. Rego/OPA if customers require it — or drop from marketing until real.
4. Unify `wardseal-mfa` into product auth story or clearly productize separately.

---

## 14. Suggested ownership matrix

| Workstream | Owner archetype | Primary packages |
| --- | --- | --- |
| Management API authz | Backend security | `cmd/*`, `pkg/middleware`, `internal/rbac` |
| IdP session/OIDC hardening | Auth engineers | `internal/auth`, `web/id` |
| SCIM & directory | Identity engineers | `internal/directory`, `internal/scim` |
| Governance permissions | IGA engineers | `internal/governance`, `internal/authz` |
| Webhooks / events | Platform | `internal/event`, `internal/webhook` |
| Deploy fail-closed | SRE | `cmd/*/main.go`, Helm values, preflight |
| Compliance evidence | Security + legal | `migrations` audit, `docs/policies`, SIEM |
| Docs/OpenAPI truth | DevRel / eng | `api/openapi.yaml`, `docs/*`, `wardseal-docs` |

---

## 15. Acceptance criteria for “enterprise ready v1”

Treat the product as enterprise-ready only when all of the following are true:

- [x] No management API accepts identity from client-controlled headers alone
- [x] Every mutate route has JWT (or mTLS service auth) **and** permission check
- [x] Production/staging refuse to start without strong service tokens and Redis for shared auth state
- [x] Open redirects allowlisted; refresh tokens hashed; Secure cookies on TLS
- [x] SCIM uses scoped credentials only
- [x] Audit logs are append-only in DB + exportable to SIEM (NDJSON); streaming connector optional later
- [x] CI runs vuln scanning + authz negative tests on every PR
- [ ] External pen test report with Critical/High closed (runbook + internal must-case suite ready)
- [x] Docs/OpenAPI/threat model match code
- [x] Documented break-glass path + IR drill runbook (`docs/runbooks/IR_DRILL.md`; first live drill evidence still to file)
- [x] Argon2id password hashing + strengthened policy
- [x] SBOM generated in CI
- [x] Route-authz registry published

---

## 16. Appendix A — Service / surface inventory

| Service | Port (local) | Major surfaces |
| --- | --- | --- |
| authsvc | 8080 | OIDC `/t/:tenant/*`, login/MFA, SAML runtime, developer apps, RBAC (dup), devices, branding |
| dirsvc | 8081 | Users/groups, tenants, SCIM `/scim/v2`, internal credential verify |
| govsvc | 8082 | Governance, orgs, campaigns, connectors, discovery, SSO admin, ChatOps, audit |
| policysvc | 8083 | Policy CRUD |
| provsvc | (compose) | Provisioning (thin routes) |
| mcpsvc | (compose) | MCP tools for AI agents |
| web/admin | manage.* | Admin console |
| web/id | auth/id | Login / user portal |
| web/developer | | Developer portal |
| web/landing | wardseal.local | Marketing |

---

## 17. Appendix B — Finding index (quick reference)

| ID | Severity | Title |
| --- | --- | --- |
| C1 | Critical | Developer API header auth — **fixed Phase A** |
| C2 | Critical | Authsvc RBAC unauthenticated — **fixed Phase A** |
| C3 | Critical | Policysvc open CRUD — **fixed Phase A** |
| C4 | Critical | Open `POST /tenants` — **fixed Phase A** (`/internal/tenants`) |
| C5 | Critical | Login open redirect — **fixed Phase A** |
| C6 | Critical | Service token fail-open — **fixed Phase A** |
| H1 | High | SCIM JWT/scope/tenant fallback — **fixed** |
| H2 | High | Governance auth without authz — **fixed Phase B** |
| H3 | High | SAML admin middleware gap — **fixed Phase A** |
| H4 | High | Cookie Secure gating — **fixed Phase B** |
| H5 | High | Plaintext refresh tokens — **fixed Phase B** |
| H6 | High | Webhook SSRF residual + durability — **fixed** (outbox/DLQ + DNS) |
| H7 | High | MCP unauthenticated mode — **fixed Phase B** |
| H8 | High | Directory JWT without roles — **fixed Phase C** |
| H9 | High | CSP unsafe-inline — **fixed Phase B** (scripts) |
| M1–M13 | Medium | See §7 |
| L1–L8 | Low | See §8 |

---

## 18. Appendix C — Recommended next actions for the team

1. **Create GitHub issues** from Phase A (one issue per Critical ID).
2. **Freeze marketing claims** that imply SOC2-complete immutable audit / completed pen test until evidence exists.
3. **Run a focused red-team day** on management APIs after Phase A.
4. **Decide product stance** on public signup vs invite-only tenants (affects C4 design).
5. **Keep this document living** — update severity status as PRs land.

---

*End of report. Generated from static repository analysis on 2026-10-10. Validate dynamically before treating any item as closed.*
