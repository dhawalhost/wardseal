# Admin Console Guide

The Admin Console provides a web-based interface for managing WardSeal.

## Accessing the Console

**URL:** http://localhost:5173

**Default Credentials:**
- Email: `admin@example.com`
- Password: `password123`
- Tenant ID: `11111111-1111-1111-1111-111111111111`

---

## Navigation

| Section | Description |
|---------|-------------|
| 📊 Dashboard | Overview and stats |
| 👥 Users | Manage identities |
| 📁 Groups | Group management |
| 🔐 RBAC Roles | Role-based access |
| 📝 Access Requests | Approval workflows |
| 🎯 Campaigns | Certification reviews |
| 🔑 SSO Config | SAML/OAuth providers |
| 🔌 Connectors | External integrations |
| 📜 Audit Logs | Activity history |
| 🛠️ API Docs | Swagger UI |
| 🔧 My Apps | Developer portal |
| 🔑 Passkeys | WebAuthn credentials |
| 🎨 Branding | Customize UI |
| 🪝 Webhooks | Event subscriptions |
| 📱 Devices | Trusted devices |
| 🛡️ MFA Setup | Configure TOTP |
| 🏢 Organizations | B2B tenants |

---

## User Management

### Create User

1. Go to **👥 Users**
2. Click **+ Create User**
3. Fill in details
4. Click **Save**

### Search Users

Use the search bar to filter by:
- Email
- Username
- Status

---

## Role-Based Access (RBAC)

### Create Role

1. Go to **🔐 RBAC Roles**
2. Click **+ New Role**
3. Enter role name and description
4. Click **Create**

### Assign Roles

Roles can be assigned via:
- User edit form
- Access request approval
- SCIM provisioning

---

## Access Request Workflow

### Submit Request

1. Go to **📝 Access Requests**
2. Click **Request Access**
3. Select target role/resource
4. Add justification
5. Submit

### Approve/Reject

Approvers see pending requests and can:
- **Approve**: Grant access
- **Reject**: Deny with reason

---

## SSO Configuration

### Add SAML Provider

1. Go to **🔑 SSO Config**
2. Click **+ New Provider**
3. Enter:
   - Name
   - Entity ID
   - SSO URL
   - Certificate
4. Save

### Test SSO

Use the "Test" button to validate configuration.

---

## Audit Logs

### View Logs

Navigate to **📜 Audit Logs** to see:
- Login attempts
- Configuration changes
- Access grants/revokes

### Export

Click **Export CSV** to download logs.

---

## Branding

### Customize Appearance

1. Go to **🎨 Branding**
2. Upload logo
3. Set primary color
4. Configure login page text
5. Save

Changes apply immediately to login widget.

---

## Webhooks

### Subscribe to Events

1. Go to **🪝 Webhooks**
2. Click **+ Add Webhook**
3. Enter:
   - URL
   - Events to subscribe
   - Secret (for signature)
4. Save

### Available Events

- `user.created`
- `user.updated`
- `user.deleted`
- `login.success`
- `login.failed`
- `mfa.enrolled`
