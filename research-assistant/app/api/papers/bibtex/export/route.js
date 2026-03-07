import { prisma } from '@/lib/prisma';
import { generateBibTeX } from '@/lib/bibtex';

function parseIds(searchParams) {
  const ids = searchParams.getAll('id');
  if (ids.length) return ids;
  const csv = searchParams.get('ids');
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ids = parseIds(searchParams);
  const limit = Number(searchParams.get('limit') || 50);

  const papers = ids.length
    ? await prisma.paper.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'desc' } })
    : await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 200) });

  if (!papers.length) {
    return new Response('% No papers found for BibTeX export\n', {
      status: 200,
      headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
    });
  }

  const content = papers.map(generateBibTeX).join('\n\n');
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-bibtex; charset=utf-8',
      'Content-Disposition': 'attachment; filename="papers-export.bib"',
    },
  });
}
