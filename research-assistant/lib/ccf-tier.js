import fs from 'node:fs';
import path from 'node:path';

let cached = null;

function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function normalizeTier(raw) {
  const tier = String(raw || '').toUpperCase();
  return ['A', 'B', 'C'].includes(tier) ? tier : 'NA';
}

function loadConfigFile() {
  const filePath = path.join(process.cwd(), 'config', 'ccf-venues.json');
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

export function loadCcfConfig() {
  if (!cached) cached = loadConfigFile();
  return cached;
}

export function resolveCcfTierByText(text, cfg = loadCcfConfig()) {
  const content = normalizeText(text);
  const venues = cfg?.venues || {};

  for (const groupName of ['conference', 'journal']) {
    const group = venues[groupName] || {};
    for (const tier of ['A', 'B', 'C']) {
      const list = group[tier] || [];
      for (const rawName of list) {
        const name = normalizeText(rawName);
        if (!name) continue;
        if (content.includes(name)) {
          return {
            ccfTier: tier,
            ccfMatchedBy: `${groupName}:${tier}:${rawName}`,
          };
        }
      }
    }
  }

  return { ccfTier: 'NA', ccfMatchedBy: null };
}

export function resolvePaperCcfTier(paper = {}, cfg = loadCcfConfig()) {
  const summary = parseSummaryJson(paper?.summaryJson);
  const explicit = normalizeTier(paper?.ccfTier || summary?.ccfTier);
  if (explicit !== 'NA') {
    return {
      ccfTier: explicit,
      ccfMatchedBy: paper?.ccfMatchedBy || summary?.ccfMatchedBy || null,
    };
  }

  const text = [
    paper?.title,
    paper?.source,
    paper?.tags,
    summary?.venue,
    summary?.journalRef,
    summary?.comment,
    summary?.booktitle,
    summary?.publisher,
    summary?.containerTitle,
  ].join(' ');

  return resolveCcfTierByText(text, cfg);
}

export function parseSummaryJson(summaryJson) {
  if (!summaryJson) return {};
  try {
    return JSON.parse(summaryJson);
  } catch {
    return {};
  }
}

export function ccfTierLabel(level) {
  if (level === 'A') return 'CCF-A';
  if (level === 'B') return 'CCF-B';
  if (level === 'C') return 'CCF-C';
  if (level === 'NA') return 'CCF-NA';
  return '全部';
}
