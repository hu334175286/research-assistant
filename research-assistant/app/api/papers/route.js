import { prisma } from '@/lib/prisma';
import { getPaperQuality } from '@/lib/paper-quality';
import { resolvePaperCcfTier } from '@/lib/ccf-tier';

const QUALITY_OPTIONS = ['all', 'high', 'medium', 'low'];
const CCF_OPTIONS = ['all', 'A', 'B', 'C', 'NA'];

function parseYear(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function parseTake(searchParams, fallback = 50) {
  const raw = Number(searchParams.get('take') || searchParams.get('limit') || fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.floor(raw), 500);
}

function hasFilter(searchParams, keys) {
  return keys.some((key) => {
    const v = searchParams.get(key);
    return v != null && String(v).trim() !== '';
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const includeMeta = ['1', 'true', 'yes'].includes(String(searchParams.get('includeMeta') || '').toLowerCase());
  const qualityRequested = String(searchParams.get('quality') || '').toLowerCase();
  const ccfRequested = String(searchParams.get('ccfTier') || searchParams.get('ccf') || '').toUpperCase();
  const sourceRequested = String(searchParams.get('source') || searchParams.get('src') || '').trim();
  const yearFromRequested = parseYear(searchParams.get('yearFrom') ?? searchParams.get('fromYear') ?? searchParams.get('startYear'));
  const yearToRequested = parseYear(searchParams.get('yearTo') ?? searchParams.get('toYear') ?? searchParams.get('endYear'));

  const qualityFilter = QUALITY_OPTIONS.includes(qualityRequested) ? qualityRequested : 'all';
  const ccfFilter = CCF_OPTIONS.includes(ccfRequested) ? ccfRequested : 'all';
  const sourceFilter = sourceRequested || 'all';

  const hasAdvancedFilter =
    includeMeta ||
    hasFilter(searchParams, [
      'quality',
      'ccfTier',
      'ccf',
      'source',
      'src',
      'yearFrom',
      'fromYear',
      'startYear',
      'yearTo',
      'toYear',
      'endYear',
      'take',
      'limit',
    ]);

  // Backward-compatible default behavior.
  if (!hasAdvancedFilter) {
    const items = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    return Response.json(items);
  }

  const requestedTake = parseTake(searchParams, 50);
  const dbTake = Math.min(Math.max(requestedTake * 3, 200), 1000);

  const where = {};
  if (sourceFilter !== 'all') where.source = sourceFilter;
  if (yearFromRequested != null || yearToRequested != null) {
    where.year = {};
    if (yearFromRequested != null) where.year.gte = yearFromRequested;
    if (yearToRequested != null) where.year.lte = yearToRequested;
  }

  const baseItems = await prisma.paper.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: dbTake,
  });

  const enriched = baseItems.map((paper) => {
    const ccf = resolvePaperCcfTier(paper);
    return {
      ...paper,
      ccfTier: ccf.ccfTier,
      ccfMatchedBy: ccf.ccfMatchedBy,
      quality: getPaperQuality(paper),
    };
  });

  const filtered = enriched.filter((paper) => {
    const qualityOk = qualityFilter === 'all' || paper.quality === qualityFilter;
    const ccfOk = ccfFilter === 'all' || paper.ccfTier === ccfFilter;
    return qualityOk && ccfOk;
  });

  const items = filtered.slice(0, requestedTake);
  const sourceOptions = ['all', ...new Set(baseItems.map((p) => String(p.source || '').trim()).filter(Boolean))];

  if (includeMeta) {
    return Response.json({
      items,
      meta: {
        requested: {
          quality: qualityFilter,
          ccfTier: ccfFilter,
          source: sourceFilter,
          yearFrom: yearFromRequested,
          yearTo: yearToRequested,
          take: requestedTake,
        },
        scanned: baseItems.length,
        matchedBeforeTake: filtered.length,
        returned: items.length,
        sourceOptions,
      },
    });
  }

  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();
  const parsedSummary = body.summaryJson || {};
  const ccf = resolvePaperCcfTier({
    title: body.title,
    source: body.source,
    tags: body.tags,
    summaryJson: JSON.stringify(parsedSummary),
  });

  const item = await prisma.paper.create({
    data: {
      title: body.title,
      year: body.year ?? null,
      source: body.source ?? null,
      tags: body.tags ?? null,
      summaryJson: JSON.stringify({ ...parsedSummary, ccfTier: ccf.ccfTier, ccfMatchedBy: ccf.ccfMatchedBy }),
      venueTier: body.venueTier ?? 'unknown',
      venueMatchedBy: body.venueMatchedBy ?? null,
    },
  });
  return Response.json(item, { status: 201 });
}
