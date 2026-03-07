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
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim());
    return { title, summary, published, id, authors, source: 'arXiv' };
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const maxResults = Math.min(Math.max(Number(searchParams.get('maxResults') || 10), 1), 30);

  if (!q) return Response.json({ error: 'q is required' }, { status: 400 });

  const url = `${ARXIV_API}?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;
  const res = await fetch(url, { headers: { 'User-Agent': 'research-assistant/0.1' } });
  if (!res.ok) return Response.json({ error: `arXiv API failed: ${res.status}` }, { status: 502 });

  const xml = await res.text();
  const items = parseEntries(xml);
  return Response.json({ query: q, count: items.length, items });
}
