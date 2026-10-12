/** Seed browser session context after login / profile fetch. */

export type AuthSessionPayload = {
  token?: string;
  tenant_id?: string;
  tenantID?: string;
  tenant_slug?: string;
  tenantSlug?: string;
  user_id?: string;
  userID?: string;
  id?: string;
  email?: string;
  name?: string;
  roles?: string[] | { name?: string }[];
};

function decodeTokenUserId(token: string | null | undefined): string {
  if (!token) return '';
  try {
    const [, payload] = token.split('.');
    if (!payload) return '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { sub?: string; user_id?: string };
    return parsed.sub || parsed.user_id || '';
  } catch {
    return '';
  }
}

function roleNames(roles: AuthSessionPayload['roles']): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => (typeof role === 'string' ? role : role?.name))
    .filter((name): name is string => typeof name === 'string');
}

/** Persist auth response fields used by MFEs (tenant headers, admin CTA). */
export function seedSessionFromAuthResponse(
  data: AuthSessionPayload,
  fallbackUserId = ''
): void {
  if (data.token) {
    localStorage.setItem('token', data.token);
  }

  const tenantID = data.tenant_id || data.tenantID || '';
  if (tenantID) {
    localStorage.setItem('tenantID', tenantID);
  }

  const tenantSlug = data.tenant_slug || data.tenantSlug || '';
  if (tenantSlug) {
    localStorage.setItem('tenantSlug', tenantSlug);
  }

  const userId =
    data.user_id ||
    data.userID ||
    data.id ||
    decodeTokenUserId(data.token) ||
    fallbackUserId;
  if (userId) {
    localStorage.setItem('userId', userId);
  }

  if (data.name) {
    localStorage.setItem('userName', data.name);
  } else if (data.email) {
    localStorage.setItem('userName', data.email);
  }

  const names = roleNames(data.roles);
  if (names.some((r) => r.toLowerCase() === 'admin')) {
    localStorage.setItem('isAdmin', 'true');
  }
}

/** Persist fields from /api/v1/user/profile and optional roles list. */
export function seedSessionFromProfile(
  profile: AuthSessionPayload,
  roles?: AuthSessionPayload['roles']
): void {
  seedSessionFromAuthResponse(profile);
  const names = roleNames(roles ?? profile.roles);
  if (names.length > 0) {
    localStorage.setItem(
      'isAdmin',
      names.some((r) => r.toLowerCase() === 'admin') ? 'true' : 'false'
    );
  }
}

export function clearSessionLocal(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('tenantID');
  localStorage.removeItem('tenantSlug');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('login_redirect_uri');
}
