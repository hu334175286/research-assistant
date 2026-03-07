import { prisma } from '@/lib/prisma';

export async function GET() {
  const [total, tierA, tierB, tierUnknown, latestMatched] = await Promise.all([
    prisma.paper.count(),
    prisma.paper.count({ where: { venueTier: 'A' } }),
    prisma.paper.count({ where: { venueTier: 'B' } }),
    prisma.paper.count({ where: { venueTier: 'unknown' } }),
    prisma.paper.findMany({
      where: { NOT: { venueMatchedBy: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        venueTier: true,
        venueMatchedBy: true,
        createdAt: true,
      },
    }),
  ]);

  return Response.json({
    total,
    tierA,
    tierB,
    tierUnknown,
    ratio: {
      A: total ? Number((tierA / total).toFixed(4)) : 0,
      B: total ? Number((tierB / total).toFixed(4)) : 0,
      unknown: total ? Number((tierUnknown / total).toFixed(4)) : 0,
    },
    latestMatched,
  });
}
