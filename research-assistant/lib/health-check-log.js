import fs from 'node:fs/promises';
import path from 'node:path';

export const HEALTH_CHECK_LATEST_PATH = path.join(process.cwd(), 'data', 'health-check-latest.json');

export async function readLatestHealthCheck() {
  const raw = await fs.readFile(HEALTH_CHECK_LATEST_PATH, 'utf8');
  return JSON.parse(raw);
}
