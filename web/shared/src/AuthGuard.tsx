import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { clearSessionLocal, seedSessionFromProfile } from './session';

export type AuthGuardProps = {
  children: React.ReactElement;
  /** 'external' = redirect to VITE_ID_URL; 'local' = same-origin /login (id MFE) */
  loginMode?: 'external' | 'local';
  apiUrl?: string;
  idUrl?: string;
};

/**
 * Verifies the httpOnly session cookie and seeds tenant context into localStorage.
 *
 * Cookie-only: never send localStorage Bearer here. Middleware prefers Authorization
 * over the cookie, so a stale/pending MFA token in localStorage causes
 * "token signature is invalid" even when wardseal_access_token is valid.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  loginMode = 'external',
  apiUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ?? '',
  idUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ID_URL ??
    'http://id.wardseal.local',
}) => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'redirect'>('loading');

  useEffect(() => {
    // Always same-origin: id/manage nginx proxies /api/v1/user → authsvc.
    // Absolute apiUrl (e.g. auth.*) is cross-site and Chromium often drops
    // Domain cookies on that hop → AuthGuard bounce loop to id login.
    axios
      .get('/api/v1/user/profile', { withCredentials: true })
      .then((res) => {
        seedSessionFromProfile(res.data ?? {});
        setStatus('ok');
      })
      .catch(() => {
        // Drop stale Bearer material so the next login cannot poison cookie auth.
        clearSessionLocal();
        if (window.location.pathname.startsWith('/login')) {
          setStatus('redirect');
          return;
        }
        const redirectUri = encodeURIComponent(window.location.href);
        if (loginMode === 'local') {
          window.location.replace(`/login?redirect_uri=${redirectUri}`);
        } else {
          window.location.replace(`${idUrl.replace(/\/$/, '')}/login?redirect_uri=${redirectUri}`);
        }
        setStatus('redirect');
      });
  }, [apiUrl, idUrl, loginMode]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'redirect') {
    return null;
  }

  return children;
};

export default AuthGuard;
