# Security gate evidence (internal)

Tracks automated coverage of buyer/ops gates. External pen-test engagement remains annual.

| Gate | Status | Evidence |
| --- | --- | --- |
| Pen-test must-cases (automated) | Covered in unit tests | See mapping below; run `go test ./internal/directory/ ./internal/rbac/ ./internal/event/ ./pkg/middleware/ ./pkg/routeauthz/` |
| Break-glass IR drill | Runbook ready | `docs/runbooks/IR_DRILL.md` — execute quarterly and file `docs/evidence/IR_DRILL_<date>.md` |
| External pen test | Operational | `docs/runbooks/PEN_TEST.md` — schedule vendor engagement |

## Automated must-case mapping (`docs/runbooks/PEN_TEST.md`)

| Must-test | Automated coverage |
| --- | --- |
| Spoofed identity headers without JWT | Phase A middleware / serviceauth tests (`pkg/middleware`) |
| JWT without permission → 403 | `internal/directory` permission test; `pkg/middleware` RequirePermission |
| Unauth `/tenants` / internal tenants | `internal/directory` create-tenant tests |
| Open redirect blocked | `web/id` `safeRedirect` tests |
| Refresh token reuse | Auth refresh hashing path (store) |
| Webhook redirect / private IP | `internal/event` private-IP + CheckRedirect |
| MCP API key outside local | mcpsvc startup guards (Phase B) |
| Audit immutability | migration `000049_audit_immutability` |
| Break-glass authz / max duration | `internal/rbac/breakglass_test.go` |
| SCIM cookie / missing scim scope | `internal/directory/scimauth_test.go` |

Last refreshed: 2026-10-11
