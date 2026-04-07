import { loadConfig } from './config-store.mjs';

const API_BASE = 'https://api.x.com';

export async function createPost(text) {
  const cfg = await loadConfig();
  if (!cfg.postingEnabled) {
    return { ok: false, error: 'posting_disabled' };
  }
  if (!cfg.auth?.authorized || !cfg.auth?.accessToken) {
    return { ok: false, error: 'not_authorized' };
  }
  if (String(cfg.auth.username || '').toLowerCase() !== String(cfg.expectedUsername || '').toLowerCase()) {
    return { ok: false, error: 'username_mismatch' };
  }

  const res = await fetch(`${API_BASE}/2/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.auth.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ text: String(text || '') })
  });

  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); } catch { json = { raw }; }
  return { ok: res.ok, status: res.status, json };
}
