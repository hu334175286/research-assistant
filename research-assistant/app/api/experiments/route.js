import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.experiment.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();
  const item = await prisma.experiment.create({
    data: {
      name: body.name,
      hypothesis: body.hypothesis ?? null,
      configJson: body.configJson ? JSON.stringify(body.configJson) : null,
      metricsJson: body.metricsJson ? JSON.stringify(body.metricsJson) : null,
      conclusion: body.conclusion ?? null,
    },
  });
  return Response.json(item, { status: 201 });
}
