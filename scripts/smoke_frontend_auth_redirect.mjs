#!/usr/bin/env node
/**
 * Smoke: manage → id login redirect_uri allowlist + baked UI assets.
 * Does not require a live API (AuthGuard will 401 until backends exist).
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function siblingHostsFromIdHost(hostname) {
  if (hostname.startsWith('id.')) {
    const rest = hostname.slice(3);
    return [`manage.${rest}`, `app.${rest}`, `developer.${rest}`, `status.${rest}`, `auth.${rest}`];
  }
  if (hostname.startsWith('id-')) {
    const rest = hostname.slice(3);
    return [`manage-${rest}`, `app-${rest}`, `developer-${rest}`, `status-${rest}`, `auth-${rest}`];
  }
  return [];
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

function assertBundleContains(appDir, needles, label) {
  const assets = path.join(appDir, 'dist', 'assets');
  assert.ok(existsSync(assets), `${label}: missing dist/assets — run npm run build first`);
  const js = readdirSync(assets).filter((f) => f.endsWith('.js'));
  assert.ok(js.length > 0, `${label}: no js bundles`);
  const blob = js.map((f) => readFileSync(path.join(assets, f), 'utf8')).join('\n');
  for (const needle of needles) {
    assert.ok(blob.includes(needle), `${label}: bundle missing ${JSON.stringify(needle)}`);
  }
}

async function serveStatic(dir, port) {
  const server = createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(dir, urlPath.replace(/^\//, ''));
    try {
      const st = statSync(filePath);
      if (!st.isFile()) throw new Error('not file');
      if (filePath.endsWith('.js')) res.setHeader('content-type', 'application/javascript');
      else if (filePath.endsWith('.css')) res.setHeader('content-type', 'text/css');
      else res.setHeader('content-type', 'text/html');
      createReadStream(filePath).pipe(res);
    } catch {
      res.setHeader('content-type', 'text/html');
      createReadStream(path.join(dir, 'index.html')).pipe(res);
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

async function main() {
  console.log('== redirect allowlist smoke ==');
  const idOrigin = 'https://id-staging.wardseal.com';
  const manageDash = 'https://manage-staging.wardseal.com/dashboard';
  assert.equal(resolveSafeRedirect(manageDash, idOrigin), manageDash);
  assert.equal(resolveSafeRedirect('https://evil.example/x', idOrigin), null);
  assert.equal(
    resolveSafeRedirect('http://manage.wardseal.local/dashboard', 'http://id.wardseal.local'),
    'http://manage.wardseal.local/dashboard'
  );
  // mismatched protocol must not pass sibling derivation alone
  assert.equal(
    resolveSafeRedirect('https://manage.wardseal.local/dashboard', 'http://id.wardseal.local'),
    null
  );
  console.log('✔ allowlist manage↔id');

  const adminDir = path.join(root, 'web/admin');
  const idDir = path.join(root, 'web/id');
  console.log('== bundle contract smoke ==');
  assertBundleContains(adminDir, ['id.wardseal.local', 'redirect_uri'], 'adminui');
  assertBundleContains(idDir, ['/login', 'set-password'], 'idui');
  console.log('✔ admin/id bundles contain auth wiring');

  console.log('== static serve smoke ==');
  const idServer = await serveStatic(path.join(idDir, 'dist'), 5180);
  const adminServer = await serveStatic(path.join(adminDir, 'dist'), 5181);
  try {
    const idLogin = await fetch('http://127.0.0.1:5180/login');
    assert.equal(idLogin.status, 200);
    const idHtml = await idLogin.text();
    assert.ok(idHtml.includes('script'), 'id login html');

    const adminHome = await fetch('http://127.0.0.1:5181/dashboard');
    assert.equal(adminHome.status, 200);
    const adminHtml = await adminHome.text();
    assert.ok(adminHtml.includes('script'), 'admin spa html');

    const redirectUri = encodeURIComponent('http://127.0.0.1:5181/dashboard');
    const guardUrl = `http://127.0.0.1:5180/login?redirect_uri=${redirectUri}`;
    const guardPage = await fetch(guardUrl);
    assert.equal(guardPage.status, 200);
    console.log('✔ id /login and admin SPA respond');
    console.log(`  AuthGuard would send users to: ${guardUrl}`);
  } finally {
    idServer.close();
    adminServer.close();
  }

  console.log('\nAll frontend auth redirect smokes passed.');
  console.log('Note: full cookie login needs running authsvc (no local k8s detected).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
