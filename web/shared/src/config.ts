/**
 * Shared environment configuration for WardSeal MFEs.
 */

import { resolveIdUrl } from './safeRedirect';

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};

export const AppConfig = {
  /** Identity / Login UI (id.*) */
  idUrl: env.VITE_ID_URL || resolveIdUrl(),

  /** This MFE's own origin / nginx proxy (often empty = same-origin) */
  apiUrl: env.VITE_API_URL ?? '',

  /** Raw authsvc URL (id MFE SSO / token calls) */
  authUrl: env.VITE_AUTH_URL || env.VITE_AUTHSVC_URL || 'http://auth.wardseal.local',

  /** Deployment mode */
  mode: env.VITE_APP_MODE ?? 'selfhost',

  allowedRedirectOrigins: env.VITE_ALLOWED_REDIRECT_ORIGINS ?? '',

  isSaaS() {
    return this.mode === 'saas';
  },
  isSelfHost() {
    return this.mode !== 'saas';
  },
};

export default AppConfig;
