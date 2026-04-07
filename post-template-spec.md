# Valhalla Ascent X Posting Spec

This layer is external to Igor. It must never alter Igor's models, launcher logic, portfolio logic, or trade decisions.

## Global Rules
- All posts must be **280 characters or fewer**.
- If a rendered post exceeds 280 characters:
  1. apply compact fallback formatting,
  2. re-count,
  3. if still > 280, fail validation and do not post.
- Posting must remain separate from Igor. Use reconciled canonical trade/accounting outputs only.
- Use official coin handles only where confidence is high. If confidence is not high, omit the handle.
- Default hashtags for all public trade/performance posts:
  - `#AlgoTrading #CryptoTrading`

## Trade Execution Template (Preferred)
```text
⚔️ Valhalla Ascent — Trade Execution

Asset: [COIN]
Entry: $[ENTRY_PRICE]
Exit: $[EXIT_PRICE]

Return: [RETURN_PCT]

Route: [SOURCE_ROUTE_TOKEN] → [DEST_ROUTE_TOKEN]

Odin Market Intelligence
Adaptive Capital Allocation

#AlgoTrading #CryptoTrading
```

### Route token rules
- Token format with handle: `$DOT @Polkadot`
- Token format without handle: `$ETH`
- USD route token: `$USD`

## Trade Execution Template (Compact Fallback)
```text
⚔️ Valhalla Ascent — Trade Execution

[COIN] | Entry $[ENTRY_PRICE] | Exit $[EXIT_PRICE]
Return: [RETURN_PCT]
Route: [SOURCE_ROUTE_TOKEN] → [DEST_ROUTE_TOKEN]

Odin Market Intelligence
#AlgoTrading #CryptoTrading
```

## Daily Summary Template (Preferred)
```text
⚔️ Valhalla Ascent — Daily Summary

Date: [MONTH DAY]

Trades executed: [TOTAL_TRADES]
Winning trades: [WINNING_TRADES]
Losing trades: [LOSING_TRADES]

Daily win rate: [WIN_RATE_PCT]

Net portfolio change: [PORTFOLIO_CHANGE_PCT]

Active launch assets: [CASHTAG_LIST]

Odin Market Intelligence
Valhalla Ascent Live Trading Log

#AlgoTrading #CryptoTrading
```

## Daily Summary Template (Compact Fallback)
```text
⚔️ Valhalla Ascent — Daily Summary

[MONTH DAY]
Trades: [TOTAL_TRADES] | Wins: [WINNING_TRADES] | Losses: [LOSING_TRADES]
Win rate: [WIN_RATE_PCT]
Net change: [PORTFOLIO_CHANGE_PCT]
Assets: [CASHTAG_LIST]

#AlgoTrading #CryptoTrading
```

## Weekly Summary Template (Preferred)
```text
⚔️ Valhalla Ascent — Weekly Performance

Week: [START_DATE – END_DATE]

Total trades: [TOTAL_TRADES]
Winning trades: [WINNING_TRADES]
Losing trades: [LOSING_TRADES]

Win rate: [WIN_RATE_PCT]

Net portfolio growth: [PORTFOLIO_GROWTH_PCT]

Active launch assets: [CASHTAG_LIST]

Odin Market Intelligence
Valhalla Ascent

#AlgoTrading #CryptoTrading
```

## Weekly Summary Template (Compact Fallback)
```text
⚔️ Valhalla Ascent — Weekly Performance

[START_DATE – END_DATE]
Trades: [TOTAL_TRADES] | Wins: [WINNING_TRADES] | Losses: [LOSING_TRADES]
Win rate: [WIN_RATE_PCT]
Growth: [PORTFOLIO_GROWTH_PCT]
Assets: [CASHTAG_LIST]

#AlgoTrading #CryptoTrading
```

## Asset List Rules
- Do not include amounts in `Active launch assets`.
- Include cashtags only.
- Example:
  - `$ADA $SOL $DOT $XRP`
- If too long, cap the list and optionally append `+N` style suffix in a later version.

## Integration Rules
- Trigger trade posts only from **canonical reconciled closed trades**.
- Trigger daily/weekly summary posts only from reporting jobs built on canonical ledger/export truth.
- This layer must never feed decisions back into Igor.

## Validation Flow
1. Build preferred template.
2. Count characters.
3. If >280, build compact fallback.
4. Count characters.
5. If still >280, mark invalid and do not post.
