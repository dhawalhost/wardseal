# Organization Onboarding Guide

Welcome to **WardSeal**! This guide is for Organization Administrators (IT Managers) to set up their company's identity integration.

By following this guide, you will enable your employees to log in to WardSeal-protected applications using your existing corporate credentials (via Okta, Azure AD, Google Workspace, etc.).

---

## Onboarding Checklist

1.  [ ] **Verify your Domain** (Required for automatic SSO redirection)
2.  [ ] **Configure Single Sign-On (SSO)**
3.  [ ] **Configure User Provisioning (SCIM)** (Optional)

---

## Phase 1: Domain Verification

Verifying your corporate domain (e.g., `acme.com`) is critical. It allows WardSeal to recognize your employees when they enter their email address and automatically redirect them to your corporate login page.

### Steps

1.  **Get your Verification Token**
    *   Log in to the **WardSeal Admin Portal**.
    *   Navigate to **Settings** > **Domain Verification**.
    *   You will see a **TXT Record** value (e.g., `wardseal-verify=a1b2c3d4...`).

2.  **Add DNS Record**
    *   Log in to your DNS provider (GoDaddy, AWS Route53, Cloudflare, etc.).
    *   Add a new **TXT** record.
    *   **Host/Name**: `_wardseal` (or `_wardseal.acme.com`)
    *   **Value**: The token from Step 1.
    *   **TTL**: 3600 (or default).

3.  **Verify**
    *   Wait for DNS propagation (usually 5-10 minutes).
    *   Click **Verify Domain** in the WardSeal portal.
    *   ✅ Status should change to **Verified**.

---

## Phase 2: Configure Single Sign-On (SSO)

WardSeal supports SAML 2.0 and OIDC. This connects your Identity Provider (IdP) to WardSeal.

### 1. Prepare your IdP (e.g., Okta/Azure AD)

Create a new application in your IdP with the following settings:

*   **Single Sign On URL (ACS URL)**:
    `https://auth.wardseal.com/saml/acs`
*   **Audience URI (SP Entity ID)**:
    `https://auth.wardseal.com/saml/metadata`
*   **Name ID Format**: `EmailAddress`
*   **Attributes**:
    *   `email` -> `user.email`
    *   `firstName` -> `user.firstName`
    *   `lastName` -> `user.lastName`

### 2. Configure WardSeal

In the WardSeal Admin Portal > **SSO Configuration**:

1.  Click **+ Add Provider**.
2.  **Name**: e.g., "Acme Corp Okta".
3.  **Protocol**: SAML 2.0.
4.  **IdP SSO URL**: Paste the login URL from your IdP.
5.  **IdP Issuer (Entity ID)**: Paste the Entity ID from your IdP.
6.  **X.509 Certificate**: Upload the certificate provided by your IdP.
7.  Click **Save**.

### 3. Test Connection

1.  Open an Incognito window.
2.  Go to the application login page.
3.  Enter an email usage your domain (e.g., `alice@acme.com`).
4.  You should be redirected to your corporate login page.
5.  After successful login, you should be redirected back to the app.

---

## Phase 3: Automated Provisioning (SCIM)

*Optional, but recommended for large organizations.*

SCIM allows you to automatically create, update, and deactivate users in WardSeal when changes happen in your HR system or IdP.

### 1. Generate SCIM Token
1.  Go to **Settings** > **SCIM Provisioning**.
2.  Click **Generate Token**.
3.  Copy the **Base URL** (`https://api.wardseal.com/scim/v2`) and **Bearer Token**.

### 2. Configure IdP
1.  In your IdP app settings, enable **Provisioning**.
2.  Select **SCIM 2.0**.
3.  Enter the Base URL and Token.
4.  Enable **Create Users**, **Update User Attributes**, and **Deactivate Users**.

---

## Support

If you encounter issues during onboarding, please contact our support team at support@wardseal.com or visit our [Help Center](https://help.wardseal.com).
