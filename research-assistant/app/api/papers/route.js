import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();
  const item = await prisma.paper.create({
    data: {
      title: body.title,
      year: body.year ?? null,
      source: body.source ?? null,
      tags: body.tags ?? null,
      summaryJson: body.summaryJson ? JSON.stringify(body.summaryJson) : null,
    },
  });
  return Response.json(item, { status: 201 });
}
