import http from 'node:http';
import { URL } from 'node:url';
import { buildAuthUrl, exchangeCode, fetchMe, assertConfig, requiredConfig } from './lib/x-oauth.mjs';
import { savePending, takePending, saveAuthorizedAccount, getAuthorizedAccount } from './lib/store.mjs';

const PORT = Number(process.env.PORT || 8080);

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/' || url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, service: 'x-social-bridge', phase: 'auth-only' });
    }

    if (url.pathname === '/auth/x/status') {
      const cfg = requiredConfig();
      const auth = getAuthorizedAccount();
      return sendJson(res, 200, {
        ok: true,
        config: {
          redirectUri: cfg.redirectUri,
          expectedUsername: cfg.expectedUsername,
          clientIdPresent: !!cfg.clientId,
          clientSecretPresent: !!cfg.clientSecret,
        },
        authorized: auth ? {
          username: auth.username,
          name: auth.name,
          id: auth.id,
          savedAt: auth.savedAt,
          tokenStored: !!auth.accessToken,
          refreshTokenStored: !!auth.refreshToken,
        } : null,
        postingEnabled: false,
      });
    }

    if (url.pathname === '/auth/x/start') {
      assertConfig();
      const { url: authUrl, state, verifier } = buildAuthUrl();
      savePending(state, { verifier });
      res.writeHead(302, { Location: authUrl });
      return res.end();
    }

    if (url.pathname === '/auth/x/callback') {
      assertConfig();
      const code = String(url.searchParams.get('code') || '').trim();
      const state = String(url.searchParams.get('state') || '').trim();
      if (!code || !state) return sendText(res, 400, 'Missing code or state');

      const pending = takePending(state);
      if (!pending?.verifier) return sendText(res, 400, 'Invalid or expired auth state');

      const tokenResult = await exchangeCode({ code, verifier: pending.verifier });
      if (!tokenResult.ok) return sendJson(res, 502, { ok: false, stage: 'token_exchange', tokenResult });

      const accessToken = String(tokenResult.json.access_token || '');
      const refreshToken = String(tokenResult.json.refresh_token || '');
      if (!accessToken) return sendJson(res, 502, { ok: false, stage: 'token_missing', tokenResult });

      const me = await fetchMe(accessToken);
      if (!me.ok) return sendJson(res, 502, { ok: false, stage: 'identity_lookup', me });

      const data = me.json?.data || {};
      const username = String(data.username || '').toLowerCase();
      const cfg = requiredConfig();
      if (!username || username !== cfg.expectedUsername) {
        return sendJson(res, 403, {
          ok: false,
          stage: 'username_mismatch',
          expected: cfg.expectedUsername,
          actual: username || null,
        });
      }

      saveAuthorizedAccount({
        id: String(data.id || ''),
        username,
        name: String(data.name || ''),
        accessToken,
        refreshToken: refreshToken || null,
      });

      return sendText(res, 200, `X auth complete. Authorized as @${username}. Posting remains disabled.`);
    }

    return sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`x-social-bridge listening on ${PORT}`);
});
