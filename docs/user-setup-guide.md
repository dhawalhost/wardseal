# User Setup Guide

Welcome to **WardSeal**! This guide will help you set up your account, secure it with Multi-Factor Authentication (MFA), and manage your login settings.

## 1. First Time Login

1.  Navigate to your organization's login page.
2.  Enter your **Email Address** and temporary **Password** (provided by your administrator).
3.  Click **Sign In**.
4.  If this is your first time, you may be prompted to change your password.

## 2. Setting Up MFA (Two-Factor Authentication)

To keep your account secure, we strongly recommend (and your organization may require) setting up MFA.

### Option A: TOTP (Authenticator App) - Recommended

1.  Download an authenticator app on your phone:
    *   **Google Authenticator** (iOS/Android)
    *   **Authy**
    *   **Microsoft Authenticator**
    *   **1Password**
2.  Log in to the **WardSeal User Portal**.
3.  Go to **Security Settings** > **MFA Setup**.
4.  Click **Enroll TOTP**.
5.  **Scan the QR Code** shown on the screen with your authenticator app.
6.  Enter the **6-digit code** displayed in your app to verify and save.

### Option B: WebAuthn (TouchID / FaceID / Security Key)

1.  Go to **Select Settings** > **Passkeys**.
2.  Click **Register New Passkey**.
3.  Follow your browser's prompts to use **TouchID**, **FaceID**, or insert your **YubiKey**.
4.  Give your key a name (e.g., "MacBook Pro TouchID") and save.

## 3. Logging In with MFA

Next time you log in:

1.  Enter your email and password.
2.  When prompted for a code, open your authenticator app.
3.  Enter the current 6-digit code.
    *   *Note: Codes change every 30 seconds.*

## 4. Trusted Devices

If you check **"Trust this device for 30 days"** during login:
*   You won't be asked for an MFA code on this browser for the next 30 days.
*   Only do this on personal devices, never on public computers.

## 5. Account Management

In the User Portal, you can also:
*   **Change Password**: Update your login credentials.
*   **Active Sessions**: View where you are currently logged in and sign out of other devices.
*   **Login History**: Review recent login activity for suspicious behavior.

---

**Need Help?**
If you are locked out or lost your authenticator device, please contact your IT Helpdesk or Organization Administrator immediately.
