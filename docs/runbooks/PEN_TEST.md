# Penetration Test Runbook

External pen testing is an operational control — this runbook prepares scope, evidence, and closure criteria so engagements produce enterprise-ready reports.

## Preconditions

- Phases A–C remediation merged (management authz, directory permissions, audit immutability, break-glass, vuln scanning).
- Staging environment with production-like auth (no empty `SERVICE_AUTH_TOKEN`, Redis-backed auth state, TLS cookies).
- Latest SBOM artifact from CI (`sbom-wardseal-cyclonedx`) attached to the engagement package.

## In-scope surfaces

| Surface | Notes |
| --- | --- |
| `authsvc` | Login, OIDC/SAML, developer API, break-glass, cookies/CSP |
| `dirsvc` | Users/groups JWT authz, `/internal/*`, SCIM |
| `govsvc` | Governance mutates, audit export, webhooks |
| `policysvc` | Policy CRUD authz |
| `mcpsvc` | API key enforcement |
| Admin / Id UI | Redirects, session cookies, password set |

## Explicit out-of-scope (unless contracted)

- Physical / social engineering of WardSeal employees
- Third-party IdP compromise (Okta/Google as federation upstream)
- Destructive testing against production customer tenants

## Must-test cases (negative)

1. Spoofed `X-User-ID` / `X-Tenant-ID` without JWT → rejected
2. JWT without resource permission on directory/governance/policy mutates → 403
3. Unauthenticated `POST /tenants` → 404; `/internal/tenants` without service token → 401
4. Open redirect on login/callback with external URL → blocked
5. Refresh token reuse after rotation → rejected
6. Webhook URL redirect / private IP → blocked
7. MCP without API key outside local → rejected
8. Audit log UPDATE/DELETE via DB role used by app → blocked by trigger
9. Break-glass without `roles:write` → 403; elevation max duration enforced

## Engagement package checklist

- [ ] Scope letter + rules of engagement signed
- [ ] Staging credentials (low-priv + admin) issued with MFA
- [ ] Architecture diagram + `docs/THREAT_MODEL.md` provided
- [ ] `docs/ENTERPRISE_AUDIT_REPORT.md` finding index provided
- [ ] SBOM + recent `govulncheck` output attached

## Closure criteria

Treat Critical/High as closed only when:

1. Vendor report lists each finding with severity and reproduction notes
2. WardSeal issue tracker has a linked fix PR (or accepted risk with owner + expiry)
3. Retest confirmation from the vendor (or internal red-team replay of the PoC)
4. This runbook’s must-test cases re-run green on staging

**Internal gate (pre-engagement):** automated must-case mapping in `docs/evidence/SECURITY_GATE.md` must be green (`go test` packages listed there). This does **not** replace the external report, but unblocks staging pilots.

## Cadence

- Full external pen test: at least annually and after major authz changes
- Focused red-team day on management APIs: after each Phase-level security remediation
- IR / break-glass drill: quarterly per `docs/runbooks/IR_DRILL.md`
