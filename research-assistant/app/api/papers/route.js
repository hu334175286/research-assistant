import { prisma } from '@/lib/prisma';
import { resolvePaperCcfTier } from '@/lib/ccf-tier';

export async function GET() {
  const items = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
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
