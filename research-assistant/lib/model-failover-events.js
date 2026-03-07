import fs from 'node:fs/promises';
import path from 'node:path';

const EVENT_LOG_PATH = path.join(process.cwd(), 'data', 'model-failover-events.jsonl');

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function appendFailoverEvent(event) {
  await fs.mkdir(path.dirname(EVENT_LOG_PATH), { recursive: true });
  const line = `${JSON.stringify(event)}\n`;
  await fs.appendFile(EVENT_LOG_PATH, line, 'utf8');
}

export async function listRecentFailoverEvents(limit = 10) {
  try {
    const raw = await fs.readFile(EVENT_LOG_PATH, 'utf8');
    const rows = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(safeJsonParse)
      .filter(Boolean);

    return rows.slice(-Math.max(1, limit)).reverse();
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

export { EVENT_LOG_PATH };
