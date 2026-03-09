import fs from 'node:fs';
import path from 'node:path';

let cachedRules = null;

function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function getVenueBuckets(cfg = {}) {
  return cfg?.venues || {};
}

function loadVenueRulesFile() {
  const filePath = path.join(process.cwd(), 'config', 'venue-rules.v2.json');
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return { enabled: false };
  }
}

function loadVenueRules() {
  if (!cachedRules) cachedRules = loadVenueRulesFile();
  return cachedRules;
}

function matchFromWhitelist(text, whitelist = {}, tiers = ['A', 'B']) {
  for (const groupName of ['conference', 'journal']) {
    const group = whitelist[groupName] || {};
    for (const tier of tiers) {
      const list = group[tier] || [];
      for (const rawName of list) {
        const name = normalizeText(rawName);
        if (!name) continue;
        if (text.includes(name)) {
          return { tier, matchedBy: `rule-whitelist:${groupName}:${tier}:${rawName}` };
        }
      }
    }
  }
  return null;
}

function matchFromRegex(text, regexRules = [], tiers = ['A', 'B']) {
  for (const rule of regexRules || []) {
    const tier = String(rule?.tier || '').toUpperCase();
    if (!tiers.includes(tier)) continue;
    if (!rule?.pattern) continue;
    try {
      const reg = new RegExp(rule.pattern, rule.flags || 'i');
      if (reg.test(text)) {
        return { tier, matchedBy: rule.matchedBy || `rule-regex:${tier}:${rule.pattern}` };
      }
    } catch {
      // ignore invalid regex and continue fallback matching
    }
  }
  return null;
}

export function getVenueKeywords(cfg = {}) {
  const buckets = getVenueBuckets(cfg);
  const rules = loadVenueRules();
  const out = [];

  for (const groupName of ['conference', 'journal']) {
    const group = buckets[groupName] || {};
    for (const tier of ['A', 'B']) {
      const list = group[tier] || [];
      for (const name of list) out.push(String(name).toLowerCase());
    }
  }

  const whitelist = rules?.enabled ? rules?.venue?.whitelist : null;
  for (const groupName of ['conference', 'journal']) {
    const group = whitelist?.[groupName] || {};
    for (const tier of ['A', 'B']) {
      const list = group[tier] || [];
      for (const name of list) out.push(String(name).toLowerCase());
    }
  }

  return [...new Set(out)];
}

export function resolveVenueTier(item = {}, cfg = {}) {
  const buckets = getVenueBuckets(cfg);
  const text = normalizeText([
    item.title,
    item.summary,
    item.journalRef,
    item.comment,
  ].join(' '));

  const rules = loadVenueRules();
  if (rules?.enabled) {
    const byWhitelist = matchFromWhitelist(text, rules?.venue?.whitelist, ['A', 'B']);
    if (byWhitelist) {
      return {
        venueTier: byWhitelist.tier,
        venueMatchedBy: byWhitelist.matchedBy,
      };
    }

    const byRegex = matchFromRegex(text, rules?.venue?.regex, ['A', 'B']);
    if (byRegex) {
      return {
        venueTier: byRegex.tier,
        venueMatchedBy: byRegex.matchedBy,
      };
    }
  }

  for (const groupName of ['conference', 'journal']) {
    const group = buckets[groupName] || {};
    for (const tier of ['A', 'B']) {
      const list = group[tier] || [];
      for (const rawName of list) {
        const name = normalizeText(rawName);
        if (!name) continue;
        if (text.includes(name)) {
          return {
            venueTier: tier,
            venueMatchedBy: `${groupName}:${tier}:${rawName}`,
          };
        }
      }
    }
  }

  return { venueTier: 'unknown', venueMatchedBy: null };
}
