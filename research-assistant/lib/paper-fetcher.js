import { prisma } from '@/lib/prisma';
import { calcRelevanceScore, loadResearchFocus } from '@/lib/research-focus';

const ARXIV_API = 'https://export.arxiv.org/api/query';

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

function hasTargetCategory(itemCategories = [], topicCategories = []) {
  if (!topicCategories.length) return true;
  return itemCategories.some((c) => topicCategories.includes(c));
}

export async function runAutoFetch() {
  const cfg = loadResearchFocus();
  if (!cfg?.enabled) return { ok: false, reason: 'disabled' };

  const maxResults = cfg.maxResultsPerQuery ?? 10;
  const minScore = cfg.minRelevanceScore ?? 2;

  let fetched = 0;
  let accepted = 0;
  let inserted = 0;
  const insertedItems = [];

  for (const topic of cfg.topics || []) {
    const url = `${ARXIV_API}?search_query=all:${encodeURIComponent(topic.query)}&start=0&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;
    const res = await fetch(url, { headers: { 'User-Agent': 'research-assistant/0.1' } });
    if (!res.ok) continue;

    const xml = await res.text();
    const items = parseEntries(xml);
    fetched += items.length;

    for (const item of items) {
      const text = [item.title, item.summary, item.journalRef, item.comment].join(' ').toLowerCase();
      const score = calcRelevanceScore(text, topic.keywords || [], cfg.venueKeywords || [], cfg.excludeKeywords || []);
      const byCategory = hasTargetCategory(item.categories || [], topic.categories || []);
      if (score < minScore || !byCategory) continue;
      accepted += 1;

      const exists = await prisma.paper.findFirst({
        where: {
          OR: [
            { title: item.title },
            { summaryJson: { contains: item.id } },
          ],
        },
      });
      if (exists) continue;

      const tags = [topic.name, 'auto-fetch', ...((item.categories || []).slice(0, 3))].join(',');
      const summaryJson = {
        abstract: item.summary,
        arxivId: item.id,
        published: item.published,
        authors: item.authors,
        journalRef: item.journalRef,
        comment: item.comment,
        categories: item.categories,
        relevanceScore: score,
      };

      const created = await prisma.paper.create({
        data: {
          title: item.title,
          year: item.published ? Number(item.published.slice(0, 4)) : null,
          source: 'arXiv:auto',
          tags,
          summaryJson: JSON.stringify(summaryJson),
        },
      });

      inserted += 1;
      insertedItems.push({ id: created.id, title: created.title, topic: topic.name, score });
    }
  }

  return { ok: true, fetched, accepted, inserted, insertedItems: insertedItems.slice(0, 20) };
}
