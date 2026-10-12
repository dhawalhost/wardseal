# Incident Response / Break-Glass Drill

Run at least quarterly (and after major authz changes). Evidence goes in `docs/evidence/`.

## Objectives

1. Confirm break-glass elevation works under real credentials
2. Confirm elevation is time-bound and audited
3. Confirm revocation / expiry restores least privilege
4. Confirm on-call can follow the runbook without tribal knowledge

## Prerequisites

- Staging tenant with a non-admin user and a `roles:write` actor
- Access to audit export (`GET /api/v1/audit/export?format=ndjson`)
- `docs/runbooks/BREAK_GLASS.md` reviewed

## Drill steps

1. **Declare drill** in #security-oncall (or equivalent). Note start time UTC.
2. **Baseline**: export audit logs; confirm target user is not `super-admin`.
3. **Elevate**:
   ```http
   POST /api/v1/break-glass/elevate
   Authorization: Bearer <roles:write JWT>
   X-Tenant-ID: <tenant>
   Content-Type: application/json

   {"user_id":"<target>","reason":"IR drill Q<n> YYYY-MM-DD","duration":"15m"}
   ```
4. **Verify**: target can perform one privileged action that previously returned 403.
5. **Observe signals**: structured log `break-glass elevation granted`; audit NDJSON contains elevation-related events.
6. **Expiry / revoke**: wait for `15m` or remove role assignment; confirm privileged action returns 403 again.
7. **Close**: capture evidence pack (below); declare drill complete.

## Negative checks (same session)

- Elevate without `roles:write` → 403
- `duration` > `8h` → 400
- `reason` shorter than 8 chars → 400

## Evidence pack (copy into `docs/evidence/IR_DRILL_<date>.md`)

```markdown
# IR Drill <YYYY-MM-DD>
- Facilitator:
- Participants:
- Environment: staging
- Start / End (UTC):
- Elevation request ID / response:
- Audit export snippet (redacted):
- Privileged action before/after:
- Issues found:
- Follow-ups:
- Sign-off:
```

## Pass criteria

- [ ] Elevation succeeded with valid actor
- [ ] Negative checks returned expected errors
- [ ] Privilege gone after expiry/revoke
- [ ] Evidence file committed or stored in security share
