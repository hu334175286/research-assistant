import { prisma } from '@/lib/prisma';

const SPLIT_OPTIONS = ['train', 'val', 'test'];

function normalizeSplit(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseOptionalInt(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseOptionalFloat(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const datasetId = searchParams.get('datasetId');

  const where = datasetId ? { datasetId } : undefined;
  const items = await prisma.datasetSplit.findMany({
    where,
    orderBy: [{ datasetId: 'asc' }, { split: 'asc' }],
    include: { dataset: { select: { id: true, name: true } } },
    take: 500,
  });

  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();

  if (!body?.datasetId) {
    return Response.json({ error: 'datasetId is required' }, { status: 400 });
  }

  const split = normalizeSplit(body.split);
  if (!SPLIT_OPTIONS.includes(split)) {
    return Response.json({ error: `split must be one of ${SPLIT_OPTIONS.join('/')}` }, { status: 400 });
  }

  const count = parseOptionalInt(body.count);
  if (Number.isNaN(count) || (typeof count === 'number' && count < 0)) {
    return Response.json({ error: 'count must be a non-negative integer' }, { status: 400 });
  }

  const ratio = parseOptionalFloat(body.ratio);
  if (Number.isNaN(ratio) || (typeof ratio === 'number' && (ratio < 0 || ratio > 1))) {
    return Response.json({ error: 'ratio must be a number between 0 and 1' }, { status: 400 });
  }

  const item = await prisma.datasetSplit.create({
    data: {
      datasetId: body.datasetId,
      split,
      count: count === undefined ? null : count,
      ratio: ratio === undefined ? null : ratio,
      note: body.note ?? null,
    },
  });

  return Response.json(item, { status: 201 });
}

export async function PATCH(req) {
  const body = await req.json();

  if (!body?.id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const data = {};

  if (Object.prototype.hasOwnProperty.call(body, 'split')) {
    const split = normalizeSplit(body.split);
    if (!SPLIT_OPTIONS.includes(split)) {
      return Response.json({ error: `split must be one of ${SPLIT_OPTIONS.join('/')}` }, { status: 400 });
    }
    data.split = split;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'count')) {
    const count = parseOptionalInt(body.count);
    if (Number.isNaN(count) || (typeof count === 'number' && count < 0)) {
      return Response.json({ error: 'count must be a non-negative integer' }, { status: 400 });
    }
    data.count = count;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ratio')) {
    const ratio = parseOptionalFloat(body.ratio);
    if (Number.isNaN(ratio) || (typeof ratio === 'number' && (ratio < 0 || ratio > 1))) {
      return Response.json({ error: 'ratio must be a number between 0 and 1' }, { status: 400 });
    }
    data.ratio = ratio;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'note')) {
    data.note = body.note ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'datasetId')) {
    if (!body.datasetId) {
      return Response.json({ error: 'datasetId cannot be empty' }, { status: 400 });
    }
    data.datasetId = body.datasetId;
  }

  const item = await prisma.datasetSplit.update({
    where: { id: body.id },
    data,
  });

  return Response.json(item);
}
