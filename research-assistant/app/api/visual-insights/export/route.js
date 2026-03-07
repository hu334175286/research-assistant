import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

const QUALITY_OPTIONS = new Set(['all', 'high', 'medium', 'low']);
const SOURCE_OPTIONS = new Set(['all', 'arXiv:auto', 'arXiv', 'manual']);

function parseYear(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function isSourceMatched(sourceFilter, sourceValue = '') {
  if (sourceFilter === 'all') return true;
  if (sourceFilter === 'manual') return !(sourceValue.startsWith('arXiv') || sourceValue === 'arXiv:auto');
  return sourceValue === sourceFilter;
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const qualityRaw = searchParams.get('quality') || 'all';
  const sourceRaw = searchParams.get('source') || 'all';
  const quality = QUALITY_OPTIONS.has(qualityRaw) ? qualityRaw : 'all';
  const source = SOURCE_OPTIONS.has(sourceRaw) ? sourceRaw : 'all';
  const yearFrom = parseYear(searchParams.get('yearFrom'));
  const yearTo = parseYear(searchParams.get('yearTo'));

  const allPapers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });

  const rows = allPapers.filter((p) => {
    const q = getPaperQuality(p);
    if (quality !== 'all' && q !== quality) return false;
    if (!isSourceMatched(source, p.source || '')) return false;

    const y = Number(p.year);
    if (yearFrom != null && Number.isFinite(y) && y < yearFrom) return false;
    if (yearTo != null && Number.isFinite(y) && y > yearTo) return false;

    return true;
  });

  const header = ['id', 'title', 'year', 'source', 'quality', 'venueTier', 'createdAt'];
  const csv = [
    header.join(','),
    ...rows.map((p) => [
      p.id,
      p.title,
      p.year ?? '',
      p.source ?? '',
      qualityLabel(getPaperQuality(p)),
      p.venueTier ?? '',
      p.createdAt ? new Date(p.createdAt).toISOString() : '',
    ].map(escCsv).join(',')),
  ].join('\n');

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="visual-insights-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
