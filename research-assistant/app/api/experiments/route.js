import { prisma } from '@/lib/prisma';

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePositiveInt(value, fallback, { min = 1, max = 200 } = {}) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const keyword = normalizeText(searchParams.get('keyword') ?? searchParams.get('q'));
  const dataset = normalizeText(searchParams.get('dataset') ?? searchParams.get('datasetId'));
  const status = normalizeText(searchParams.get('status'));
  const paperId = normalizeText(searchParams.get('paperId'));

  const page = parsePositiveInt(searchParams.get('page'), 1, { min: 1, max: 100000 });
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize') ?? searchParams.get('take') ?? searchParams.get('limit'),
    50,
    { min: 1, max: 500 },
  );

  const includeMeta = (searchParams.get('includeMeta') || '').trim() === '1';

  const filters = [];

  // Status filter
  if (status && status !== 'all') {
    filters.push({ status });
  }

  // Dataset filter
  if (dataset && dataset !== 'all') {
    if (dataset === 'none') {
      filters.push({ datasetId: null });
    } else {
      filters.push({ datasetId: dataset });
    }
  }

  // Paper filter
  if (paperId && paperId !== 'all') {
    if (paperId === 'none') {
      filters.push({ sourcePaperId: null });
    } else {
      filters.push({ sourcePaperId: paperId });
    }
  }

  // Keyword search
  if (keyword) {
    filters.push({
      OR: [
        { name: { contains: keyword } },
        { hypothesis: { contains: keyword } },
        { conclusion: { contains: keyword } },
        { tags: { contains: keyword } },
        { datasetVersionSnapshot: { contains: keyword } },
        { dataset: { is: { name: { contains: keyword } } } },
        { sourcePaper: { is: { title: { contains: keyword } } } },
      ],
    });
  }

  const where = filters.length ? { AND: filters } : undefined;

  const [items, total] = await Promise.all([
    prisma.experiment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { 
        dataset: true,
        sourcePaper: { select: { id: true, title: true, year: true } }
      },
    }),
    prisma.experiment.count({ where }),
  ]);

  if (!includeMeta) return Response.json(items);

  return Response.json({
    items,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
    },
  });
}

export async function POST(req) {
  const body = await req.json();
  const name = normalizeText(body.name);

  if (!name) {
    return Response.json({ error: 'name 为必填字段' }, { status: 400 });
  }

  const datasetId = normalizeText(body.datasetId);
  let datasetVersionSnapshot = normalizeText(body.datasetVersionSnapshot);

  if (datasetId && !datasetVersionSnapshot) {
    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId }, select: { version: true } });
    datasetVersionSnapshot = normalizeText(dataset?.version);
  }

  const item = await prisma.experiment.create({
    data: {
      name,
      status: 'draft',
      hypothesis: normalizeText(body.hypothesis),
      conclusion: normalizeText(body.conclusion),
      tags: normalizeText(body.tags),
      configJson: body.configJson ? JSON.stringify(body.configJson) : null,
      metricsJson: body.metricsJson ? JSON.stringify(body.metricsJson) : null,
      sourcePaperId: normalizeText(body.sourcePaperId),
      datasetId,
      datasetVersionSnapshot,
      codeSnapshot: normalizeText(body.codeSnapshot),
      environment: normalizeText(body.environment),
    },
    include: { 
      dataset: true,
      sourcePaper: { select: { id: true, title: true, year: true } }
    },
  });
  return Response.json(item, { status: 201 });
}
