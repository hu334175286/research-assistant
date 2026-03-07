import fs from 'node:fs';
import path from 'node:path';

const CFG_PATH = path.join(process.cwd(), 'config', 'research-focus.json');

export function loadResearchFocus() {
  const raw = fs.readFileSync(CFG_PATH, 'utf8');
  return JSON.parse(raw);
}

export function calcRelevanceScore(text, keywords = [], venueKeywords = [], excludeKeywords = []) {
  const t = (text || '').toLowerCase();
  let score = 0;

  for (const kw of keywords) {
    if (t.includes(String(kw).toLowerCase())) score += 1;
  }
  for (const v of venueKeywords) {
    if (t.includes(String(v).toLowerCase())) score += 2;
  }
  for (const ex of excludeKeywords) {
    if (t.includes(String(ex).toLowerCase())) score -= 2;
  }
  return score;
}
