import { prisma } from '@/lib/prisma';
import { runAutoFetch } from '@/lib/paper-fetcher';
import { loadResearchFocus } from '@/lib/research-focus';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const run = searchParams.get('run') === '1';

  if (run) {
    const result = await runAutoFetch();
    return Response.json({ mode: 'run', ...result });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayAutoFetched, totalAutoFetched, latestAutoFetched] = await Promise.all([
    prisma.paper.count({ where: { source: 'arXiv:auto', createdAt: { gte: todayStart } } }),
    prisma.paper.count({ where: { source: 'arXiv:auto' } }),
    prisma.paper.findMany({ where: { source: 'arXiv:auto' }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  const cfg = loadResearchFocus();
  return Response.json({
    mode: 'status',
    config: {
      enabled: cfg.enabled,
      fetchEveryMinutes: cfg.fetchEveryMinutes,
      topics: cfg.topics?.map((t) => ({ name: t.name, query: t.query })),
      minRelevanceScore: cfg.minRelevanceScore,
    },
    todayAutoFetched,
    totalAutoFetched,
    latestAutoFetched,
  });
}

export async function POST() {
  const result = await runAutoFetch();
  return Response.json({ mode: 'run', ...result });
}
