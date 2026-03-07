import { prisma } from '@/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';

  const results = {
    papers: [],
    experiments: [],
    reports: [],
  };

  const searchFilters = {
    contains: q,
    mode: 'insensitive',
  };

  if (type === 'all' || type === 'paper') {
    results.papers = await prisma.paper.findMany({
      where: {
        OR: [
          { title: searchFilters },
          { source: searchFilters },
          { tags: searchFilters },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  if (type === 'all' || type === 'experiment') {
    results.experiments = await prisma.experiment.findMany({
      where: {
        OR: [
          { name: searchFilters },
          { hypothesis: searchFilters },
          { conclusion: searchFilters },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  if (type === 'all' || type === 'report') {
    const dailyReports = await prisma.dailyReport.findMany({
      where: {
        OR: [
          { dayKey: searchFilters },
          { contentShort: searchFilters },
          { contentFull: searchFilters },
        ],
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });

    const weeklyReports = await prisma.weeklyReport.findMany({
      where: {
        OR: [
          { weekKey: searchFilters },
          { contentMd: searchFilters },
        ],
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });

    results.reports = [
      ...dailyReports.map(r => ({ ...r, reportType: 'daily' })),
      ...weeklyReports.map(r => ({ ...r, reportType: 'weekly' })),
    ];
  }

  return Response.json(results);
}
