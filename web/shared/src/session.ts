/** Seed browser session context after login / profile fetch. */

export type AuthSessionPayload = {
  token?: string;
  /** Some endpoints (WebAuthn finish) return access_token instead of token. */
  access_token?: string;
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

function decodeJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeTokenUserId(token: string | null | undefined): string {
  const parsed = decodeJwtPayload(token);
  if (!parsed) return '';
  return (
    (typeof parsed.sub === 'string' && parsed.sub) ||
    (typeof parsed.user_id === 'string' && parsed.user_id) ||
    ''
  );
}

/** Roles claim from access token (works when RBAC user-roles API is unreachable). */
export function rolesFromAccessToken(token: string | null | undefined): string[] {
  const parsed = decodeJwtPayload(token);
  if (!parsed || !Array.isArray(parsed.roles)) return [];
  return parsed.roles.filter((r): r is string => typeof r === 'string');
}

function roleNames(roles: AuthSessionPayload['roles']): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => (typeof role === 'string' ? role : role?.name))
    .filter((name): name is string => typeof name === 'string');
}

/** Org founders get `super-admin`; some tenants use `admin`. */
export function roleGrantsAdminConsole(roleName: string): boolean {
  const n = roleName.toLowerCase();
  return n === 'admin' || n === 'super-admin';
}

export function rolesGrantAdminConsole(roles: AuthSessionPayload['roles']): boolean {
  return roleNames(roles).some(roleGrantsAdminConsole);
}

/** Persist auth response fields used by MFEs (tenant headers, admin CTA). */
export function seedSessionFromAuthResponse(
  data: AuthSessionPayload,
  fallbackUserId = ''
): void {
  const accessToken = data.token || data.access_token || '';
  if (accessToken) {
    localStorage.setItem('token', accessToken);
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
    decodeTokenUserId(accessToken) ||
    fallbackUserId;
  if (userId) {
    localStorage.setItem('userId', userId);
  }

  if (data.name) {
    localStorage.setItem('userName', data.name);
  } else if (data.email) {
    localStorage.setItem('userName', data.email);
  }

  if (rolesGrantAdminConsole(data.roles)) {
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
    localStorage.setItem('isAdmin', rolesGrantAdminConsole(names) ? 'true' : 'false');
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
