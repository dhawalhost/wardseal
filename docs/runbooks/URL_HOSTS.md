# URL / frontend host audit

Canonical hosts for the **Helm umbrella** (what cloud staging/prod actually expose).

## Host map

| Role | Local | Staging | Production |
| --- | --- | --- | --- |
| Auth API | `auth.wardseal.local` | `auth-staging.wardseal.com` | `auth.wardseal.com` |
| Platform API | `api.wardseal.local` | `api-staging.wardseal.com` | `api.wardseal.com` |
| Admin console | `manage.wardseal.local` | `manage-staging.wardseal.com` | `manage.wardseal.com` |
| Identity / login UI | `id.wardseal.local` | `id-staging.wardseal.com` | `id.wardseal.com` |
| Landing | `wardseal.local` | `staging.wardseal.com` | `wardseal.com` |

## Backend contract

| Env var | Points to | Notes |
| --- | --- | --- |
| `AUTH_SERVICE_URL` | `auth*` | Public auth base |
| `UI_URL` | `id*` | Login, set-password, email links |
| `CORS_ALLOWED_ORIGINS` | `id*`, `manage*`, landing, `auth*` | Only hosts that exist in ingress |

## Frontend build (`VITE_*`)

Baked at image build time (CI `environment` input or `deploy_local_k8s.sh`):

| App | Critical vars |
| --- | --- |
| `adminui` | `VITE_ID_URL` → `id*`, `VITE_AUTHSVC_URL` / `DIR` / `GOV` → auth/api, `VITE_API_URL` → `manage*` |
| `idui` | `VITE_API_URL` → `id*`, `VITE_AUTH_URL` / `VITE_AUTHSVC_URL` → `auth*`, optional DIR/GOV |
| `landingui` | `VITE_CONSOLE_BASE_URL` → `manage*`, `VITE_SITE_BASE_URL` → landing |

Shared package `@wardseal/shared` (AuthGuard, safeRedirect, session seeding) is used by admin + id.

Post-login `redirect_uri` may target sibling hosts (`manage*`, etc.). Allowlist = current origin + hosts derived from `id*` + optional `VITE_ALLOWED_REDIRECT_ORIGINS`.

## Not in Helm umbrella (compose-only MFEs)

`web/app`, `web/developer`, `web/status` remain available via `docker-compose.ui.yml` (`app.*`, `developer.*`, `status.*`). They are **not** cloud-deployed until charts/ingress are added. Do not list those hosts in staging/prod CORS.

## Deprecated names

Do **not** use: `admin.wardseal.com`, `admin-staging`, `console-staging`, `app.wardseal.com` / `app-staging` as the admin console (console is `manage*`).

## Validation

```bash
make config-lint
```

Asserts id/manage hosts, `UI_URL` → `id*`, idui chart render, and no phantom `app*` hosts in staging/prod renders.
