import fs from 'node:fs';
import path from 'node:path';
import { validatePostLength } from './post-validate.mjs';

const META_PATH = path.join(process.cwd(), 'coin-x-metadata.json');
const DEFAULT_HASHTAGS = '#AlgoTrading #CryptoTrading';

function readMeta() {
  return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
}

function fmtPct(n, decimals = 2) {
  const v = Number(n || 0);
  const sign = v > 0 ? '+' : v < 0 ? '' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtPrice(n) {
  return Number(n || 0).toFixed(2);
}

function routeToken(asset, meta) {
  const key = String(asset || '').toUpperCase();
  const entry = meta[key] || { cashtag: `$${key}`, handle: null, handleConfidence: 'none' };
  const includeHandle = ['high', 'medium_high'].includes(String(entry.handleConfidence || '')) && !!entry.handle;
  return includeHandle ? `${entry.cashtag} ${entry.handle}` : `${entry.cashtag}`;
}

function fallbackTrade(input, meta) {
  return [
    '⚔️ Valhalla Ascent — Trade Execution',
    '',
    `${input.coin} | Entry $${fmtPrice(input.entryPrice)} | Exit $${fmtPrice(input.exitPrice)}`,
    `Return: ${fmtPct(input.returnPct, 2)}`,
    `Route: ${routeToken(input.sourceAsset, meta)} → ${routeToken(input.destinationAsset, meta)}`,
    '',
    'Odin Market Intelligence',
    DEFAULT_HASHTAGS,
  ].join('\n');
}

export function formatTradeExecutionPost(input) {
  const meta = readMeta();
  const preferred = [
    '⚔️ Valhalla Ascent — Trade Execution',
    '',
    `Asset: ${input.coin}`,
    `Entry: $${fmtPrice(input.entryPrice)}`,
    `Exit: $${fmtPrice(input.exitPrice)}`,
    '',
    `Return: ${fmtPct(input.returnPct, 2)}`,
    '',
    `Route: ${routeToken(input.sourceAsset, meta)} → ${routeToken(input.destinationAsset, meta)}`,
    '',
    'Odin Market Intelligence',
    'Adaptive Capital Allocation',
    '',
    DEFAULT_HASHTAGS,
  ].join('\n');

  const preferredCheck = validatePostLength(preferred, 280);
  if (preferredCheck.ok) return { ok: true, text: preferred, length: preferredCheck.length, template: 'preferred' };

  const compact = fallbackTrade(input, meta);
  const compactCheck = validatePostLength(compact, 280);
  if (compactCheck.ok) return { ok: true, text: compact, length: compactCheck.length, template: 'compact' };

  return { ok: false, error: 'trade_post_too_long', preferredLength: preferredCheck.length, compactLength: compactCheck.length };
}

function joinAssets(assets, meta, maxItems = 6) {
  return (assets || []).slice(0, maxItems).map((a) => routeToken(a, meta).split(' ')[0]).join(' ');
}

export function formatDailySummaryPost(input) {
  const meta = readMeta();
  const preferred = [
    '⚔️ Valhalla Ascent — Daily Summary',
    '',
    `Date: ${input.dateLabel}`,
    '',
    `Trades executed: ${input.totalTrades}`,
    `Winning trades: ${input.winningTrades}`,
    `Losing trades: ${input.losingTrades}`,
    '',
    `Daily win rate: ${fmtPct(input.winRatePct, 1)}`,
    '',
    `Net portfolio change: ${fmtPct(input.portfolioChangePct, 1)}`,
    '',
    `Active launch assets: ${joinAssets(input.activeAssets, meta)}`,
    '',
    'Odin Market Intelligence',
    'Valhalla Ascent Live Trading Log',
    '',
    DEFAULT_HASHTAGS,
  ].join('\n');
  const preferredCheck = validatePostLength(preferred, 280);
  if (preferredCheck.ok) return { ok: true, text: preferred, length: preferredCheck.length, template: 'preferred' };

  const compact = [
    '⚔️ Valhalla Ascent — Daily Summary',
    '',
    `${input.dateLabel}`,
    `Trades: ${input.totalTrades} | Wins: ${input.winningTrades} | Losses: ${input.losingTrades}`,
    `Win rate: ${fmtPct(input.winRatePct, 1)}`,
    `Net change: ${fmtPct(input.portfolioChangePct, 1)}`,
    `Assets: ${joinAssets(input.activeAssets, meta, 4)}`,
    '',
    DEFAULT_HASHTAGS,
  ].join('\n');
  const compactCheck = validatePostLength(compact, 280);
  if (compactCheck.ok) return { ok: true, text: compact, length: compactCheck.length, template: 'compact' };

  return { ok: false, error: 'daily_post_too_long', preferredLength: preferredCheck.length, compactLength: compactCheck.length };
}

export function formatWeeklySummaryPost(input) {
  const meta = readMeta();
  const preferred = [
    '⚔️ Valhalla Ascent — Weekly Performance',
    '',
    `Week: ${input.weekLabel}`,
    '',
    `Total trades: ${input.totalTrades}`,
    `Winning trades: ${input.winningTrades}`,
    `Losing trades: ${input.losingTrades}`,
    '',
    `Win rate: ${fmtPct(input.winRatePct, 1)}`,
    '',
    `Net portfolio growth: ${fmtPct(input.portfolioGrowthPct, 1)}`,
    '',
    `Active launch assets: ${joinAssets(input.activeAssets, meta)}`,
    '',
    'Odin Market Intelligence',
    'Valhalla Ascent',
    '',
    DEFAULT_HASHTAGS,
  ].join('\n');
  const preferredCheck = validatePostLength(preferred, 280);
  if (preferredCheck.ok) return { ok: true, text: preferred, length: preferredCheck.length, template: 'preferred' };

  const compact = [
    '⚔️ Valhalla Ascent — Weekly Performance',
    '',
    `${input.weekLabel}`,
    `Trades: ${input.totalTrades} | Wins: ${input.winningTrades} | Losses: ${input.losingTrades}`,
    `Win rate: ${fmtPct(input.winRatePct, 1)}`,
    `Growth: ${fmtPct(input.portfolioGrowthPct, 1)}`,
    `Assets: ${joinAssets(input.activeAssets, meta, 4)}`,
    '',
    DEFAULT_HASHTAGS,
  ].join('\n');
  const compactCheck = validatePostLength(compact, 280);
  if (compactCheck.ok) return { ok: true, text: compact, length: compactCheck.length, template: 'compact' };

  return { ok: false, error: 'weekly_post_too_long', preferredLength: preferredCheck.length, compactLength: compactCheck.length };
}
