const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');

const prisma = new PrismaClient();
const ARXIV_API = 'https://export.arxiv.org/api/query';

function loadConfig() {
  const p = path.join(process.cwd(), 'config', 'research-focus.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function extract(tag, text) {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim().replace(/\n+/g, ' ') : '';
}

function parseEntries(xml) {
  const chunks = xml.split('<entry>').slice(1);
  return chunks.map((chunk) => {
    const entry = `<entry>${chunk}`;
    const title = extract('title', entry);
    const summary = extract('summary', entry);
    const published = extract('published', entry);
    const id = extract('id', entry);
    const journalRef = extract('arxiv:journal_ref', entry);
    const comment = extract('arxiv:comment', entry);
    const categories = [...entry.matchAll(/term="([^"]+)"/g)].map((m) => m[1]);
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim());
    return { title, summary, published, id, journalRef, comment, categories, authors };
  });
}

function getVenueKeywords(cfg = {}) {
  const out = [];
  for (const groupName of ['conference', 'journal']) {
    const group = (cfg.venues || {})[groupName] || {};
    for (const tier of ['A', 'B']) {
      for (const name of group[tier] || []) out.push(String(name).toLowerCase());
    }
  }
  return [...new Set(out)];
}

function resolveVenueTier(item, cfg = {}) {
  const text = [item.title, item.summary, item.journalRef, item.comment].join(' ').toLowerCase();
  for (const groupName of ['conference', 'journal']) {
    const group = (cfg.venues || {})[groupName] || {};
    for (const tier of ['A', 'B']) {
      for (const rawName of group[tier] || []) {
        const name = String(rawName || '').toLowerCase();
        if (name && text.includes(name)) {
          return { venueTier: tier, venueMatchedBy: `${groupName}:${tier}:${rawName}` };
        }
      }
    }
  }
  return { venueTier: 'unknown', venueMatchedBy: null };
}

function loadCcfConfig() {
  const p = path.join(process.cwd(), 'config', 'ccf-venues.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function resolveCcfTier(item, ccf = {}) {
  const text = [item.title, item.summary, item.journalRef, item.comment].join(' ').toLowerCase();
  for (const groupName of ['conference', 'journal']) {
    const group = (ccf.venues || {})[groupName] || {};
    for (const tier of ['A', 'B', 'C']) {
      for (const rawName of group[tier] || []) {
        const name = String(rawName || '').toLowerCase();
        if (name && text.includes(name)) {
          return { ccfTier: tier, ccfMatchedBy: `${groupName}:${tier}:${rawName}` };
        }
      }
    }
  }
  return { ccfTier: 'NA', ccfMatchedBy: null };
}

function score(text, keywords = [], venueKeywords = [], excludeKeywords = [], cfg = {}) {
  const t = String(text || '').toLowerCase();
  let s = 0;
  const mergedVenueKeywords = [...(venueKeywords || []), ...getVenueKeywords(cfg)];
  for (const kw of keywords) if (t.includes(String(kw).toLowerCase())) s += 1;
  for (const kw of mergedVenueKeywords) if (t.includes(String(kw).toLowerCase())) s += 2;
  for (const kw of excludeKeywords) if (t.includes(String(kw).toLowerCase())) s -= 2;
  return s;
}

async function main() {
  const cfg = loadConfig();
  const ccfCfg = loadCcfConfig();
  if (!cfg.enabled) {
    console.log('Auto fetch disabled by config.');
    return;
  }

  let inserted = 0;

  for (const topic of cfg.topics || []) {
    const url = `${ARXIV_API}?search_query=all:${encodeURIComponent(topic.query)}&start=0&max_results=${cfg.maxResultsPerQuery || 10}&sortBy=lastUpdatedDate&sortOrder=descending`;
    const res = await fetch(url, { headers: { 'User-Agent': 'research-assistant/0.1' } });
    if (!res.ok) continue;
    const xml = await res.text();
    const items = parseEntries(xml);

    for (const item of items) {
      const text = [item.title, item.summary, item.journalRef, item.comment].join(' ');
      const relevance = score(text, topic.keywords || [], cfg.venueKeywords || [], cfg.excludeKeywords || [], cfg);
      const inCategory = (topic.categories || []).length === 0 || (item.categories || []).some((c) => topic.categories.includes(c));
      const venue = resolveVenueTier(item, cfg);
      const ccf = resolveCcfTier(item, ccfCfg);
      if (relevance < (cfg.minRelevanceScore || 2) || !inCategory) continue;

      const exists = await prisma.paper.findFirst({
        where: {
          OR: [{ title: item.title }, { summaryJson: { contains: item.id } }],
        },
      });
      if (exists) continue;

      await prisma.paper.create({
        data: {
          title: item.title,
          year: item.published ? Number(item.published.slice(0, 4)) : null,
          source: 'arXiv:auto',
          tags: [topic.name, 'auto-fetch', ...(item.categories || []).slice(0, 3)].join(','),
          summaryJson: JSON.stringify({
            abstract: item.summary,
            arxivId: item.id,
            published: item.published,
            authors: item.authors,
            journalRef: item.journalRef,
            comment: item.comment,
            categories: item.categories,
            relevance,
            venueTier: venue.venueTier,
            venueMatchedBy: venue.venueMatchedBy,
            ccfTier: ccf.ccfTier,
            ccfMatchedBy: ccf.ccfMatchedBy,
          }),
          venueTier: venue.venueTier,
          venueMatchedBy: venue.venueMatchedBy,
        },
      });
      inserted += 1;
    }
  }

  console.log(`Auto fetch completed. Inserted: ${inserted}`);
}

main().finally(() => prisma.$disconnect());
