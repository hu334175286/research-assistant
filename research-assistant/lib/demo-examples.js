import fs from 'node:fs';
import path from 'node:path';

const DEMO_CFG_PATH = path.join(process.cwd(), 'config', 'demo-examples.json');

export function loadDemoExamples() {
  try {
    const raw = fs.readFileSync(DEMO_CFG_PATH, 'utf8');
    const json = JSON.parse(raw);
    return {
      sourceNote: String(json?.sourceNote || ''),
      quick: Array.isArray(json?.quick) ? json.quick : [],
    };
  } catch {
    return { sourceNote: '', quick: [] };
  }
}
