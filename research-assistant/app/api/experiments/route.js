import { prisma } from '@/lib/prisma';

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const items = await prisma.experiment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { dataset: true },
  });
  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();
  const name = normalizeText(body.name);

  if (!name) {
    return Response.json({ error: 'name 为必填字段' }, { status: 400 });
  }

  const item = await prisma.experiment.create({
    data: {
      name,
      hypothesis: normalizeText(body.hypothesis),
      configJson: body.configJson ? JSON.stringify(body.configJson) : null,
      metricsJson: body.metricsJson ? JSON.stringify(body.metricsJson) : null,
      conclusion: normalizeText(body.conclusion),
      datasetId: normalizeText(body.datasetId),
      datasetVersionSnapshot: normalizeText(body.datasetVersionSnapshot),
    },
    include: { dataset: true },
  });
  return Response.json(item, { status: 201 });
}
