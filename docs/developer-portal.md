# Developer Portal Guide

The Developer Portal enables self-service registration of OAuth applications and API key management.

## Table of Contents

- [Registering an OAuth App](#registering-an-oauth-app)
- [Managing API Keys](#managing-api-keys)
- [Login Widget](#login-widget)
- [API Reference](#api-reference)

---

## Registering an OAuth App

### Via Admin UI

1. Navigate to **🔧 My Apps** in the sidebar
2. Click **+ New App**
3. Fill in the form:
   - **Name**: Your app's name
   - **Redirect URIs**: Comma-separated callback URLs
   - **App Type**: Web, SPA, Native, or Machine-to-Machine
4. Click **Create**
5. **Save the Client Secret** - it's only shown once!

### Via API

```bash
curl -X POST http://localhost:8080/api/v1/apps \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -H "X-User-ID: your-user-id" \
  -d '{
    "name": "My Web App",
    "description": "Production web application",
    "redirect_uris": ["https://myapp.com/callback"],
    "app_type": "web"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My Web App",
  "client_id": "vv_a1b2c3d4e5f6...",
  "client_secret": "vvs_secret...",  // Only shown once!
  "redirect_uris": ["https://myapp.com/callback"],
  "app_type": "web",
  "status": "active"
}
```

### Rotating Client Secret

```bash
curl -X POST http://localhost:8080/api/v1/apps/{app_id}/rotate-secret \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

---

## Managing API Keys

API keys enable programmatic access without OAuth flows.

### Create API Key

**Via Admin UI:**
1. Go to **🔧 My Apps**
2. Scroll to **API Keys** section
3. Click **+ New API Key**
4. Enter a name and click **Create**
5. **Copy the key immediately** - it won't be shown again!

**Via API:**
```bash
curl -X POST http://localhost:8080/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -H "X-User-ID: your-user-id" \
  -d '{"name": "CI/CD Pipeline"}'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "CI/CD Pipeline",
  "key": "vv_live_a1b2c3d4...",  // Save this!
  "key_prefix": "vv_live_a1b2c3...",
  "message": "Save this key now - it won't be shown again!"
}
```

### Using API Keys

Include the key in the Authorization header:

```bash
curl http://localhost:8080/api/v1/some-endpoint \
  -H "Authorization: Bearer vv_live_a1b2c3d4..."
```

### Revoke API Key

```bash
curl -X DELETE http://localhost:8080/api/v1/api-keys/{key_id} \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

---

## Login Widget

WardSeal provides an embeddable login widget for quick integration.

### Quick Start

Add to any HTML page:

```html
<script src="https://your-domain/widget/wardseal-login.js"></script>
<div id="wardseal-login"></div>
<script>
  WardSeal.init({
    tenantId: 'YOUR_TENANT_ID',
    clientId: 'YOUR_CLIENT_ID',
    onSuccess: (token) => {
      console.log('Login successful!');
      // Store token, redirect user, etc.
    },
    onError: (err) => {
      console.error('Login failed:', err);
    }
  });
</script>
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `container` | string | CSS selector for widget container (default: `#wardseal-login`) |
| `tenantId` | string | Your tenant ID |
| `clientId` | string | Your OAuth client ID |
| `baseUrl` | string | API base URL (default: current origin) |
| `onSuccess` | function | Called with token on successful login |
| `onError` | function | Called with error on failure |
| `branding.primaryColor` | string | Primary button color |
| `branding.logoUrl` | string | URL to your logo |

### Features

- ✅ Username/password login
- ✅ MFA (TOTP) support
- ✅ Social login buttons
- ✅ Customizable branding
- ✅ Responsive design

### Demo

Open `/widget/demo.html` to see the widget in action.

---

## API Reference

### Apps

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/apps` | List your apps |
| POST | `/api/v1/apps` | Create app |
| GET | `/api/v1/apps/:id` | Get app details |
| PUT | `/api/v1/apps/:id` | Update app |
| DELETE | `/api/v1/apps/:id` | Delete app |
| POST | `/api/v1/apps/:id/rotate-secret` | Rotate secret |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List your API keys |
| POST | `/api/v1/api-keys` | Create API key |
| DELETE | `/api/v1/api-keys/:id` | Revoke API key |
