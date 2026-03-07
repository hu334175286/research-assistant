import fs from 'node:fs';
import path from 'node:path';
import { getVenueKeywords } from '@/lib/venue-tier';

const CFG_PATH = path.join(process.cwd(), 'config', 'research-focus.json');

export function loadResearchFocus() {
  const raw = fs.readFileSync(CFG_PATH, 'utf8');
  return JSON.parse(raw);
}

export function calcRelevanceScore(text, keywords = [], venueKeywords = [], excludeKeywords = [], cfg = null) {
  const t = (text || '').toLowerCase();
  let score = 0;

  const mergedVenueKeywords = [...(venueKeywords || []), ...(cfg ? getVenueKeywords(cfg) : [])];

  for (const kw of keywords) {
    if (t.includes(String(kw).toLowerCase())) score += 1;
  }
  for (const v of mergedVenueKeywords) {
    if (t.includes(String(v).toLowerCase())) score += 2;
  }
  for (const ex of excludeKeywords) {
    if (t.includes(String(ex).toLowerCase())) score -= 2;
  }
  return score;
}
