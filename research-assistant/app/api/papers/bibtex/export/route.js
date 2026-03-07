import { prisma } from '@/lib/prisma';
import { generateBibTeX } from '@/lib/bibtex';
import { getPaperQuality } from '@/lib/paper-quality';

function parseIds(searchParams) {
  const ids = searchParams.getAll('id');
  if (ids.length) return ids;
  const csv = searchParams.get('ids');
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseYear(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function parseQuality(searchParams) {
  const quality = String(searchParams.get('quality') || 'all').toLowerCase();
  return ['all', 'high', 'medium', 'low'].includes(quality) ? quality : 'all';
}

function buildStatsComment({
  totalBeforeFilter,
  totalExported,
  quality,
  yearFrom,
  yearTo,
  limit,
  qualityStats,
  yearStats,
}) {
  const filters = [
    `quality=${quality}`,
    `yearFrom=${yearFrom ?? 'none'}`,
    `yearTo=${yearTo ?? 'none'}`,
    `limit=${limit}`,
  ].join(', ');

  return [
    '% Research Assistant BibTeX Export',
    `% Filters: ${filters}`,
    `% Total before filter: ${totalBeforeFilter}`,
    `% Exported: ${totalExported}`,
    `% Quality breakdown: high=${qualityStats.high}, medium=${qualityStats.medium}, low=${qualityStats.low}`,
    `% Year span in export: ${yearStats.min ?? 'N/A'}-${yearStats.max ?? 'N/A'}`,
    '',
  ].join('\n');
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ids = parseIds(searchParams);
  const quality = parseQuality(searchParams);
  const yearFrom = parseYear(searchParams.get('yearFrom'));
  const yearTo = parseYear(searchParams.get('yearTo'));
  const limit = Math.min(parsePositiveInt(searchParams.get('limit') || 50, 50), 200);

  const basePapers = ids.length
    ? await prisma.paper.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'desc' } })
    : await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });

  const filtered = basePapers.filter((paper) => {
    const paperQuality = getPaperQuality(paper);
    if (quality !== 'all' && paperQuality !== quality) return false;

    const paperYear = Number(paper.year);
    if (yearFrom != null && Number.isFinite(paperYear) && paperYear < yearFrom) return false;
    if (yearTo != null && Number.isFinite(paperYear) && paperYear > yearTo) return false;

    return true;
  });

  const papers = filtered.slice(0, limit);

  if (!papers.length) {
    const comment = buildStatsComment({
      totalBeforeFilter: basePapers.length,
      totalExported: 0,
      quality,
      yearFrom,
      yearTo,
      limit,
      qualityStats: { high: 0, medium: 0, low: 0 },
      yearStats: { min: null, max: null },
    });

    return new Response(`${comment}% No papers found for BibTeX export\n`, {
      status: 200,
      headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
    });
  }

  const qualityStats = { high: 0, medium: 0, low: 0 };
  const years = [];
  for (const paper of papers) {
    const paperQuality = getPaperQuality(paper);
    if (paperQuality in qualityStats) qualityStats[paperQuality] += 1;

    const y = Number(paper.year);
    if (Number.isFinite(y) && y > 0) years.push(y);
  }

  const headerComment = buildStatsComment({
    totalBeforeFilter: basePapers.length,
    totalExported: papers.length,
    quality,
    yearFrom,
    yearTo,
    limit,
    qualityStats,
    yearStats: years.length ? { min: Math.min(...years), max: Math.max(...years) } : { min: null, max: null },
  });

  const content = `${headerComment}${papers.map(generateBibTeX).join('\n\n')}`;
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-bibtex; charset=utf-8',
      'Content-Disposition': 'attachment; filename="papers-export.bib"',
    },
  });
}
