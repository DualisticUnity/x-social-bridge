import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'post-history.json');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadHistory() {
  await ensureDir();
  try {
    return JSON.parse(await fs.readFile(HISTORY_PATH, 'utf8'));
  } catch {
    return { events: {} };
  }
}

async function saveHistory(history) {
  await ensureDir();
  await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  return history;
}

export async function hasPosted(dedupeKey) {
  const history = await loadHistory();
  return !!history.events[dedupeKey]?.posted;
}

export async function recordPostAttempt({ dedupeKey, type, content, posted, postId = null, meta = {} }) {
  const history = await loadHistory();
  history.events[dedupeKey] = {
    dedupeKey,
    type,
    content,
    posted: !!posted,
    postId,
    meta,
    updatedAt: new Date().toISOString()
  };
  await saveHistory(history);
  return history.events[dedupeKey];
}

export async function listRecent(limit = 20) {
  const history = await loadHistory();
  return Object.values(history.events)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}
