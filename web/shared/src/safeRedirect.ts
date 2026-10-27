/**
 * Safe post-login redirects for multi-host WardSeal UIs.
 *
 * Allows:
 * - same-origin relative paths
 * - same origin absolute URLs
 * - absolute URLs whose origin is in the allowlist
 *   (VITE_ALLOWED_REDIRECT_ORIGINS and/or sibling hosts derived from id.*)
 */

function parseEnvOrigins(envValue?: string): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Derive manage/app/… sibling hosts from an id.* hostname. */
export function siblingHostsFromIdHost(hostname: string): string[] {
  if (hostname.startsWith('id.')) {
    const rest = hostname.slice(3);
    return [
      `manage.${rest}`,
      `app.${rest}`,
      `developer.${rest}`,
      `status.${rest}`,
      `auth.${rest}`,
      `wardseal.${rest}`,
      rest,
    ];
  }
  if (hostname.startsWith('id-')) {
    const rest = hostname.slice(3); // e.g. staging.wardseal.com
    return [
      `manage-${rest}`,
      `app-${rest}`,
      `developer-${rest}`,
      `status-${rest}`,
      `auth-${rest}`,
      rest,
    ];
  }
  return [];
}

export function getAllowedRedirectOrigins(
  currentOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
  envList?: string
): Set<string> {
  const allowed = new Set<string>();
  if (currentOrigin) {
    allowed.add(currentOrigin);
  }

  const fromEnv =
    envList ??
    (typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env
          ?.VITE_ALLOWED_REDIRECT_ORIGINS
      : undefined);

  for (const origin of parseEnvOrigins(fromEnv)) {
    allowed.add(origin.replace(/\/$/, ''));
  }

  try {
    if (currentOrigin) {
      const url = new URL(currentOrigin);
      for (const host of siblingHostsFromIdHost(url.hostname)) {
        allowed.add(`${url.protocol}//${host}`);
      }
    }
  } catch {
    // ignore invalid currentOrigin
  }

  return allowed;
}

/**
 * Returns a safe redirect target, or null if the value is unsafe.
 */
export function resolveSafeRedirect(
  redirectUri: string | null | undefined,
  currentOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
  allowedOrigins?: Set<string>
): string | null {
  if (!redirectUri) {
    return null;
  }

  const value = redirectUri.trim();
  if (!value) {
    return null;
  }

  // Relative path only — reject protocol-relative "//evil.com"
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }

  try {
    const target = new URL(value);
    const allowed = allowedOrigins ?? getAllowedRedirectOrigins(currentOrigin);
    if (allowed.has(target.origin)) {
      return target.href;
    }
  } catch {
    return null;
  }

  return null;
}

/** Navigate to a safe redirect or fall back to defaultPath (same-origin path or absolute). */
export function navigateSafeRedirect(
  redirectUri: string | null | undefined,
  defaultPath: string,
  currentOrigin: string = typeof window !== 'undefined' ? window.location.origin : ''
): void {
  const safe = resolveSafeRedirect(redirectUri, currentOrigin);
  if (safe) {
    if (safe.startsWith('/')) {
      window.location.assign((currentOrigin || window.location.origin) + safe);
    } else {
      window.location.assign(safe);
    }
    return;
  }
  if (defaultPath.startsWith('http://') || defaultPath.startsWith('https://')) {
    window.location.assign(defaultPath);
  } else {
    window.location.assign((currentOrigin || window.location.origin) + defaultPath);
  }
}

/** Identity / Login UI URL for the current environment (local / staging / production). */
export function resolveIdUrl(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''
): string {
  const explicit = (
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ID_URL
      : undefined
  )?.trim();
  if (explicit) {
    return explicit;
  }
  if (hostname.endsWith('.local')) {
    return 'http://id.wardseal.local';
  }
  if (hostname.includes('-staging.') || hostname.startsWith('staging.')) {
    return 'https://id-staging.wardseal.com';
  }
  if (
    hostname.startsWith('manage.') ||
    hostname.startsWith('app.') ||
    hostname.startsWith('developer.') ||
    hostname.startsWith('status.') ||
    hostname.startsWith('wardseal.')
  ) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    const rest = hostname.replace(/^(manage|app|developer|status|wardseal)\./, '');
    return `${protocol}//id.${rest}`;
  }
  return 'https://id.wardseal.com';
}

/** Console URL for the current environment (local / staging / production). */
export function resolveManageConsoleUrl(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''
): string {
  const explicit = (
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_CONSOLE_BASE_URL ||
        (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MANAGE_URL
      : undefined
  )?.trim();
  if (explicit) {
    return explicit;
  }
  if (hostname.endsWith('.local')) {
    return 'http://manage.wardseal.local';
  }
  if (hostname.includes('-staging.') || hostname.startsWith('staging.')) {
    return 'https://manage-staging.wardseal.com';
  }
  if (
    hostname.startsWith('id.') ||
    hostname.startsWith('app.') ||
    hostname.startsWith('developer.') ||
    hostname.startsWith('status.') ||
    hostname.startsWith('wardseal.')
  ) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    const rest = hostname.replace(/^(id|app|developer|status|wardseal)\./, '');
    return `${protocol}//manage.${rest}`;
  }
  return 'https://manage.wardseal.com';
}
