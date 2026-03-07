import fs from 'node:fs/promises';
import path from 'node:path';
import { loadRouterConfig } from '@/lib/model-router';

const EVENT_LOG_PATH = path.join(process.cwd(), 'data', 'model-failover-events.jsonl');
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function getAllModelsFromRouter() {
  const cfg = loadRouterConfig();
  const set = new Set();

  Object.values(cfg.routes || {}).forEach((route) => {
    if (route?.primary) set.add(route.primary);
    (route?.fallbacks || []).forEach((model) => set.add(model));
  });

  return [...set];
}

function toHealthLevel(failCount, switchCount) {
  if (failCount >= 3 || switchCount >= 6) return 'red';
  if (failCount >= 1 || switchCount >= 2) return 'yellow';
  return 'green';
}

async function listRecentEvents() {
  try {
    const raw = await fs.readFile(EVENT_LOG_PATH, 'utf8');
    const now = Date.now();

    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(safeJsonParse)
      .filter(Boolean)
      .filter((event) => {
        const ts = Date.parse(event.ts || '');
        return Number.isFinite(ts) && now - ts <= RECENT_WINDOW_MS;
      });
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

export async function getModelHealthSummary() {
  const [models, events] = await Promise.all([Promise.resolve(getAllModelsFromRouter()), listRecentEvents()]);

  return models.map((model) => {
    const failCount = events.filter((event) => event.from === model).length;
    const switchCount = events.filter((event) => event.from === model || event.to === model).length;

    return {
      model,
      failCount,
      switchCount,
      health: toHealthLevel(failCount, switchCount),
    };
  });
}

export { EVENT_LOG_PATH, RECENT_WINDOW_MS };
