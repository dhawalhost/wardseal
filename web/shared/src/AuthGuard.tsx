import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { seedSessionFromProfile } from './session';

export type AuthGuardProps = {
  children: React.ReactElement;
  /** 'external' = redirect to VITE_ID_URL; 'local' = same-origin /login (id MFE) */
  loginMode?: 'external' | 'local';
  apiUrl?: string;
  idUrl?: string;
};

/**
 * Verifies the httpOnly session cookie and seeds tenant context into localStorage.
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
    axios
      .get(`${apiUrl}/api/v1/user/profile`, { withCredentials: true })
      .then((res) => {
        seedSessionFromProfile(res.data ?? {});
        setStatus('ok');
      })
      .catch(() => {
        const redirectUri = encodeURIComponent(window.location.href);
        if (loginMode === 'local') {
          window.location.href = `/login?redirect_uri=${redirectUri}`;
        } else {
          window.location.href = `${idUrl}/login?redirect_uri=${redirectUri}`;
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
