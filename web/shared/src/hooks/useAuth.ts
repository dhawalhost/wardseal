/**
 * Shared auth hooks — session via httpOnly cookie + profile endpoint.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AppConfig } from '../config';
import { clearSessionLocal } from '../session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useRequireAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const idUrl = AppConfig.idUrl;
  const apiUrl = AppConfig.apiUrl;

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/v1/user/profile`, {
          withCredentials: true,
        });
        setUser(res.data);
      } catch {
        const redirectUri = encodeURIComponent(window.location.href);
        window.location.href = `${idUrl}/login?redirect_uri=${redirectUri}`;
      } finally {
        setLoading(false);
      }
    };
    void verify();
  }, [apiUrl, idUrl]);

  const logout = async () => {
    try {
      await axios.get(`${apiUrl}/logout`, { withCredentials: true });
    } catch {
      // ignore
    }
    clearSessionLocal();
    window.location.href = `${idUrl}/login`;
  };

  return { user, loading, logout };
}

/** Lightweight logout helper — does not redirect on missing session. */
export function useAuth() {
  const apiUrl = AppConfig.apiUrl;
  const idUrl = AppConfig.idUrl;

  const logout = async () => {
    try {
      await axios.get(`${apiUrl}/logout`, { withCredentials: true });
    } catch {
      // ignore
    }
    clearSessionLocal();
    window.location.href = `${idUrl}/login`;
  };

  return { logout };
}
