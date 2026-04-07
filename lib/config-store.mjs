import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  postingEnabled: false,
  postingMode: 'disabled',
  expectedUsername: process.env.X_EXPECTED_USERNAME || 'valhalla_ascent',
  auth: {
    authorized: false,
    username: null,
    name: null,
    id: null,
    accessToken: null,
    refreshToken: null,
    savedAt: null
  }
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadConfig() {
  await ensureDir();
  try {
    const txt = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(txt);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      auth: { ...DEFAULT_CONFIG.auth, ...(parsed.auth || {}) }
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config) {
  await ensureDir();
  const merged = {
    ...DEFAULT_CONFIG,
    ...config,
    auth: { ...DEFAULT_CONFIG.auth, ...((config && config.auth) || {}) }
  };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

export async function setAuthorizedAccount(data) {
  const cfg = await loadConfig();
  cfg.auth = {
    authorized: true,
    username: data.username,
    name: data.name,
    id: data.id,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    savedAt: new Date().toISOString()
  };
  return saveConfig(cfg);
}

export async function setPostingEnabled(enabled) {
  const cfg = await loadConfig();
  cfg.postingEnabled = !!enabled;
  if (!enabled && cfg.postingMode === 'auto') cfg.postingMode = 'disabled';
  return saveConfig(cfg);
}

export async function setPostingMode(mode) {
  const allowed = new Set(['disabled','manual','auto']);
  if (!allowed.has(mode)) throw new Error(`Invalid posting mode: ${mode}`);
  const cfg = await loadConfig();
  cfg.postingMode = mode;
  cfg.postingEnabled = mode !== 'disabled' ? cfg.postingEnabled : false;
  return saveConfig(cfg);
}
