# Break-Glass Emergency Access

Use this only when normal admin access is unavailable and business/security impact justifies temporary privilege elevation.

## Prerequisites

- A principal that already holds `roles:write` (usually `super-admin`), **or** vault access to mint a short-lived admin session
- Tenant ID of the affected organization
- Written incident ticket / reason (persisted in logs)

## Elevate via API

```http
POST /api/v1/break-glass/elevate
Authorization: Bearer <admin-jwt>
X-Tenant-ID: <tenant-uuid>
Content-Type: application/json

{
  "user_id": "<target-user-uuid>",
  "reason": "SEV-1: lockout recovery for on-call",
  "duration": "1h"
}
```

Constraints:

- `reason` ≥ 8 characters (required)
- `duration` defaults to `1h`, maximum `8h`
- Grants time-bound `super-admin` via `user_roles.expires_at`
- Emits a high-severity structured log: `break-glass elevation granted`

## After the incident

1. Confirm the elevation expired (or revoke the role assignment early).
2. Rotate any credentials used during the incident.
3. Attach API response + logs to the IR ticket.
4. Schedule a post-incident review within 5 business days.

## Forbidden

- Using break-glass for routine admin work
- Setting `WARDSEAL_MCP_TENANT_ID=*` (wildcard MCP access is blocked)
- Leaving elevation longer than needed
