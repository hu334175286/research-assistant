import fs from 'node:fs/promises';
import path from 'node:path';

export const MODEL_SWITCH_LOG_PATH = path.join(process.cwd(), 'data', 'model-switch-log.jsonl');

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function getLatestModelSwitchEvent() {
  try {
    const raw = await fs.readFile(MODEL_SWITCH_LOG_PATH, 'utf8');
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const parsed = safeJsonParse(lines[i]);
      if (parsed) return parsed;
    }

    return null;
  } catch (err) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}
