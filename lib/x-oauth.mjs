import crypto from 'node:crypto';

const API_BASE = 'https://api.x.com';
const AUTH_BASE = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.x.com/2/oauth2/token';

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

export function requiredConfig() {
  return {
    clientId: env('X_CLIENTID'),
    clientSecret: env('X_CLIENTSECRET'),
    redirectUri: env('X_REDIRECT_URI', 'https://x-social-bridge-production.up.railway.app/auth/x/callback'),
    expectedUsername: env('X_EXPECTED_USERNAME', 'valhalla_ascent').toLowerCase(),
  };
}

export function assertConfig() {
  const cfg = requiredConfig();
  const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing required config: ${missing.join(', ')}`);
  return cfg;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generatePkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(24));
  return { verifier, challenge, state };
}

export function buildAuthUrl() {
  const cfg = assertConfig();
  const pkce = generatePkce();
  const url = new URL(AUTH_BASE);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  url.searchParams.set('state', pkce.state);
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url: url.toString(), state: pkce.state, verifier: pkce.verifier };
}

export async function exchangeCode({ code, verifier }) {
  const cfg = assertConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

export async function fetchMe(accessToken) {
  const res = await fetch(`${API_BASE}/2/users/me?user.fields=username,name,id`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}
