import http from 'node:http';
import { URL } from 'node:url';
import { buildAuthUrl, exchangeCode, fetchMe, assertConfig, requiredConfig } from './lib/x-oauth.mjs';
import { savePending, takePending } from './lib/store.mjs';
import { loadConfig, setAuthorizedAccount, setPostingEnabled, setPostingMode } from './lib/config-store.mjs';
import { listRecent } from './lib/post-history-store.mjs';
import { formatTradeExecutionPost, formatDailySummaryPost, formatWeeklySummaryPost } from './lib/post-formatters.mjs';
import { createPost } from './lib/x-post.mjs';
import { recordPostAttempt } from './lib/post-history-store.mjs';

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
      const stored = await loadConfig();
      const auth = stored.auth?.authorized ? stored.auth : null;
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
        postingEnabled: !!stored.postingEnabled,
        postingMode: stored.postingMode,
      });
    }

    if (url.pathname === '/control/status') {
      const stored = await loadConfig();
      const recent = await listRecent(10);
      return sendJson(res, 200, {
        ok: true,
        postingEnabled: !!stored.postingEnabled,
        postingMode: stored.postingMode,
        expectedUsername: stored.expectedUsername,
        authorizedUsername: stored.auth?.username || null,
        tokenStored: !!stored.auth?.accessToken,
        refreshTokenStored: !!stored.auth?.refreshToken,
        recentPosts: recent
      });
    }

    if (url.pathname === '/control/enable-posting' && req.method === 'POST') {
      const cfg = await setPostingEnabled(true);
      return sendJson(res, 200, { ok: true, postingEnabled: cfg.postingEnabled, postingMode: cfg.postingMode });
    }

    if (url.pathname === '/control/enable-posting-now' && req.method === 'GET') {
      const cfg = await setPostingEnabled(true);
      return sendText(res, 200, `Posting enabled. Mode=${cfg.postingMode}.`);
    }

    if (url.pathname === '/control/disable-posting' && req.method === 'POST') {
      const cfg = await setPostingEnabled(false);
      return sendJson(res, 200, { ok: true, postingEnabled: cfg.postingEnabled, postingMode: cfg.postingMode });
    }

    if (url.pathname === '/control/disable-posting-now' && req.method === 'GET') {
      const cfg = await setPostingEnabled(false);
      return sendText(res, 200, `Posting disabled. Mode=${cfg.postingMode}.`);
    }

    if (url.pathname === '/control/set-mode' && req.method === 'POST') {
      const mode = String(url.searchParams.get('mode') || '').trim();
      const cfg = await setPostingMode(mode);
      return sendJson(res, 200, { ok: true, postingEnabled: cfg.postingEnabled, postingMode: cfg.postingMode });
    }

    if (url.pathname === '/posts/dry-run' && req.method === 'GET') {
      const type = String(url.searchParams.get('type') || 'trade').trim();
      if (type === 'trade') {
        return sendJson(res, 200, formatTradeExecutionPost({
          coin: String(url.searchParams.get('coin') || 'DOT'),
          entryPrice: Number(url.searchParams.get('entry') || 4.18),
          exitPrice: Number(url.searchParams.get('exit') || 4.27),
          returnPct: Number(url.searchParams.get('returnPct') || 2.15),
          sourceAsset: String(url.searchParams.get('source') || 'USD'),
          destinationAsset: String(url.searchParams.get('destination') || 'DOT')
        }));
      }
      if (type === 'daily') {
        return sendJson(res, 200, formatDailySummaryPost({
          dateLabel: String(url.searchParams.get('date') || 'April 7'),
          totalTrades: Number(url.searchParams.get('trades') || 5),
          winningTrades: Number(url.searchParams.get('wins') || 3),
          losingTrades: Number(url.searchParams.get('losses') || 2),
          winRatePct: Number(url.searchParams.get('winRate') || 60),
          portfolioChangePct: Number(url.searchParams.get('change') || 1.3),
          activeAssets: String(url.searchParams.get('assets') || 'ADA,SOL,DOT,XRP').split(',').map(s => s.trim()).filter(Boolean)
        }));
      }
      if (type === 'weekly') {
        return sendJson(res, 200, formatWeeklySummaryPost({
          weekLabel: String(url.searchParams.get('week') || 'Apr 1 – Apr 7'),
          totalTrades: Number(url.searchParams.get('trades') || 19),
          winningTrades: Number(url.searchParams.get('wins') || 11),
          losingTrades: Number(url.searchParams.get('losses') || 8),
          winRatePct: Number(url.searchParams.get('winRate') || 57.9),
          portfolioGrowthPct: Number(url.searchParams.get('growth') || 4.6),
          activeAssets: String(url.searchParams.get('assets') || 'ADA,SOL,DOT,XRP').split(',').map(s => s.trim()).filter(Boolean)
        }));
      }
      return sendJson(res, 400, { ok: false, error: 'Unknown dry-run type' });
    }

    if (url.pathname === '/posts/manual' && req.method === 'POST') {
      const text = String(url.searchParams.get('text') || '').trim();
      if (!text) return sendJson(res, 400, { ok: false, error: 'Missing text' });
      const cfg = await loadConfig();
      if (!cfg.postingEnabled) return sendJson(res, 403, { ok: false, error: 'posting_disabled' });
      const result = await createPost(text);
      await recordPostAttempt({ dedupeKey: `manual:${Date.now()}`, type: 'manual', content: text, posted: !!result.ok, postId: result.json?.data?.id || null, meta: { status: result.status || null } });
      return sendJson(res, result.ok ? 200 : 502, result);
    }

    if (url.pathname === '/posts/manual-test' && req.method === 'GET') {
      const text = String(url.searchParams.get('text') || '').trim();
      if (!text) return sendText(res, 400, 'Missing text');
      const cfg = await loadConfig();
      if (!cfg.postingEnabled) return sendText(res, 403, 'Posting is disabled.');
      const result = await createPost(text);
      await recordPostAttempt({ dedupeKey: `manual:${Date.now()}`, type: 'manual', content: text, posted: !!result.ok, postId: result.json?.data?.id || null, meta: { status: result.status || null } });
      return sendText(res, result.ok ? 200 : 502, result.ok ? `Posted successfully. Post ID: ${result.json?.data?.id || 'unknown'}` : `Post failed: ${JSON.stringify(result)}`);
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

      await setAuthorizedAccount({
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
