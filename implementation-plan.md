# X Social Bridge Implementation Plan

This bridge must remain external to Igor and must never alter Igor's models, launchers, portfolio logic, or trade decisions.

## Core Principles
- No recurring jobs attached to any chat session.
- All scheduling must run in isolated infra (Railway cron/external scheduler/bridge-native job routes).
- Posting remains disabled by default.
- Only canonical reconciled trade/reporting data may feed the bridge.
- Fail closed on auth, validation, duplication, or length errors.

## Files / Modules to Add

### 1. `lib/config-store.mjs`
Purpose:
- Durable bridge config and auth state.

Store:
- postingEnabled
- postingMode (`disabled|manual|auto`)
- expectedUsername
- authorized username/id
- access token / refresh token
- token metadata / expiry

### 2. `lib/post-history-store.mjs`
Purpose:
- Track dedupe keys and recent post outcomes.

Store:
- `trade:<trade_id>`
- `daily:<yyyy-mm-dd>`
- `weekly:<yyyy-week>`
- rendered content
- posted status
- x post id if present
- timestamps

### 3. `lib/post-formatters.mjs`
Purpose:
- Render trade/daily/weekly posts using `post-template-spec.md` and `coin-x-metadata.json`.

Functions:
- `formatTradeExecutionPost(input)`
- `formatDailySummaryPost(input)`
- `formatWeeklySummaryPost(input)`

### 4. `lib/post-validate.mjs`
Purpose:
- Enforce 280-char rule and hard fail if the post cannot be compacted enough.

Functions:
- `validatePostLength(text)`
- `applyCompactFallback(type, input)`

### 5. `lib/x-post.mjs`
Purpose:
- Actual X posting layer.

Functions:
- `createPost(text)`

Constraints:
- no posting if config says disabled
- no posting unless auth identity matches expected username
- no posting without explicit enabled state

### 6. `lib/trade-feed.mjs`
Purpose:
- Read canonical reconciled closed trades from the authoritative reporting layer.

Functions:
- `fetchClosedTradesToPost()`
- `fetchDailySummaryPayload()`
- `fetchWeeklySummaryPayload()`

This module must consume reconciled truth only.

## Routes / Endpoints to Add

### Existing
- `GET /health`
- `GET /auth/x/start`
- `GET /auth/x/callback`
- `GET /auth/x/status`

### Add control routes
- `GET /control/status`
- `POST /control/enable-posting`
- `POST /control/disable-posting`
- `POST /control/set-mode`

### Add internal job routes
- `POST /jobs/check-closed-trades`
- `POST /jobs/daily-summary`
- `POST /jobs/weekly-summary`

### Optional diagnostics
- `GET /posts/recent`
- `GET /posts/pending`

## Scheduling Plan

### Trade-complete checks
- isolated scheduler or Railway cron hits `POST /jobs/check-closed-trades`
- not chat-bound
- dedupe using trade ids

### Daily summary
- scheduler hits `POST /jobs/daily-summary` at `19:00 UTC`
- within requested 18:00–20:00 UTC window

### Weekly summary
- scheduler hits `POST /jobs/weekly-summary` at `Sunday 13:00 UTC`
- within requested 12:00–14:00 UTC window

## Founder Control Rules

### Enable rule
Posting remains disabled until founder explicitly says:
- enable posting on X
- turn on X posting
- start posting to X

Implementation effect:
- `postingEnabled = true`

### Disable rule
Posting stops immediately when founder explicitly says:
- stop posting on X
- disable posting on X
- pause X posting

Implementation effect:
- `postingEnabled = false`
- no backlog flush unless explicitly requested

## Safety Guarantees
- One-way flow only: reconciled truth -> X bridge
- No X bridge action may alter Igor runtime or trade state
- No recurring session-bound jobs
- No post from raw intents or unreconciled orders
- No post above 280 characters
- Duplicates blocked by stable dedupe keys

## Recommended Rollout Order
1. Durable auth/config storage
2. Post history / dedupe store
3. Formatter + validation modules
4. Manual trade-close candidate generation
5. Control routes for enable/disable/mode
6. Manual post test only
7. Add daily/weekly job routes
8. Add isolated schedulers
9. Only later consider auto posting of trade closes
