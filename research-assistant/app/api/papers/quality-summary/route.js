import { prisma } from '@/lib/prisma';
import { resolvePaperCcfTier } from '@/lib/ccf-tier';

export async function GET() {
  const [total, tierA, tierB, tierUnknown, latestMatched, ccfScan] = await Promise.all([
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
    prisma.paper.findMany({
      select: {
        id: true,
        title: true,
        source: true,
        tags: true,
        summaryJson: true,
      },
    }),
  ]);

  const ccf = { A: 0, B: 0, C: 0, NA: 0 };
  for (const paper of ccfScan) {
    const { ccfTier } = resolvePaperCcfTier(paper);
    ccf[ccfTier] += 1;
  }

  const covered = ccf.A + ccf.B + ccf.C;

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
    ccf: {
      ...ccf,
      ratio: {
        A: total ? Number((ccf.A / total).toFixed(4)) : 0,
        B: total ? Number((ccf.B / total).toFixed(4)) : 0,
        C: total ? Number((ccf.C / total).toFixed(4)) : 0,
        NA: total ? Number((ccf.NA / total).toFixed(4)) : 0,
      },
    },
    coverage: {
      covered,
      uncovered: ccf.NA,
      ratio: total ? Number((covered / total).toFixed(4)) : 0,
    },
    latestMatched,
  });
}
