import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Mirrors web/shared/src/safeRedirect.ts for node:test without a TS runner.
function siblingHostsFromIdHost(hostname) {
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
    const rest = hostname.slice(3);
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

function resolveIdUrl(hostname = '') {
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
    const rest = hostname.replace(/^(manage|app|developer|status|wardseal)\./, '');
    return `https://id.${rest}`;
  }
  return 'https://id.wardseal.com';
}

function getAllowedRedirectOrigins(currentOrigin = '', envList = '') {
  const allowed = new Set();
  if (currentOrigin) allowed.add(currentOrigin);
  for (const o of envList.split(',').map((s) => s.trim()).filter(Boolean)) {
    allowed.add(o.replace(/\/$/, ''));
  }
  try {
    if (currentOrigin) {
      const url = new URL(currentOrigin);
      for (const host of siblingHostsFromIdHost(url.hostname)) {
        allowed.add(`${url.protocol}//${host}`);
      }
    }
  } catch {
    // ignore
  }
  return allowed;
}

function resolveSafeRedirect(redirectUri, currentOrigin = '', allowedOrigins) {
  if (!redirectUri) return null;
  const value = redirectUri.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const target = new URL(value);
    const allowed = allowedOrigins ?? getAllowedRedirectOrigins(currentOrigin);
    if (allowed.has(target.origin)) return target.href;
  } catch {
    return null;
  }
  return null;
}

describe('resolveSafeRedirect', () => {
  const origin = 'https://id.wardseal.local';

  it('allows same-origin relative paths', () => {
    assert.equal(resolveSafeRedirect('/portal', origin), '/portal');
  });

  it('rejects protocol-relative URLs', () => {
    assert.equal(resolveSafeRedirect('//evil.example/phish', origin), null);
  });

  it('allows absolute URLs on the same origin', () => {
    assert.equal(
      resolveSafeRedirect('https://id.wardseal.local/portal', origin),
      'https://id.wardseal.local/portal'
    );
  });

  it('allows sibling manage host derived from id.*', () => {
    assert.equal(
      resolveSafeRedirect('https://manage.wardseal.local/dashboard', origin),
      'https://manage.wardseal.local/dashboard'
    );
  });

  it('allows manage-staging from id-staging', () => {
    const stg = 'https://id-staging.wardseal.com';
    assert.equal(
      resolveSafeRedirect('https://manage-staging.wardseal.com/dashboard', stg),
      'https://manage-staging.wardseal.com/dashboard'
    );
  });

  it('rejects absolute external URLs', () => {
    assert.equal(resolveSafeRedirect('https://evil.example/phish', origin), null);
  });

  it('honors explicit env allowlist', () => {
    const allowed = getAllowedRedirectOrigins(origin, 'https://custom.example');
    assert.equal(
      resolveSafeRedirect('https://custom.example/app', origin, allowed),
      'https://custom.example/app'
    );
  });

  it('resolves id URL dynamically for local, staging, and custom domains', () => {
    assert.equal(resolveIdUrl('manage.wardseal.local'), 'http://id.wardseal.local');
    assert.equal(resolveIdUrl('wardseal.local'), 'http://id.wardseal.local');
    assert.equal(resolveIdUrl('manage-staging.wardseal.com'), 'https://id-staging.wardseal.com');
    assert.equal(resolveIdUrl('manage.wardseal.com'), 'https://id.wardseal.com');
    assert.equal(resolveIdUrl('manage.acme-corp.com'), 'https://id.acme-corp.com');
  });
});
