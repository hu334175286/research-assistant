import { prisma } from '@/lib/prisma';

function parseMetrics(metricsJson) {
  if (!metricsJson) return null;
  try {
    const raw = typeof metricsJson === 'string' ? JSON.parse(metricsJson) : metricsJson;
    if (!raw || typeof raw !== 'object') return null;

    const sampleCount = Number(raw.sampleCount);
    const missingRate = Number(raw.missingRate);
    const classDistribution = raw.classDistribution && typeof raw.classDistribution === 'object'
      ? raw.classDistribution
      : null;

    return {
      sampleCount: Number.isFinite(sampleCount) ? sampleCount : null,
      missingRate: Number.isFinite(missingRate) ? missingRate : null,
      classDistribution,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const datasets = await prisma.dataset.findMany({
    select: {
      id: true,
      name: true,
      metricsJson: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  let withMetrics = 0;
  let totalSamples = 0;
  let missingRateSum = 0;
  let missingRateCount = 0;
  const classTotals = {};

  const latest = datasets.slice(0, 20).map((d) => {
    const metrics = parseMetrics(d.metricsJson);
    if (metrics) {
      withMetrics += 1;

      if (metrics.sampleCount != null) {
        totalSamples += metrics.sampleCount;
      }

      if (metrics.missingRate != null) {
        missingRateSum += metrics.missingRate;
        missingRateCount += 1;
      }

      if (metrics.classDistribution) {
        for (const [label, value] of Object.entries(metrics.classDistribution)) {
          const n = Number(value);
          if (!Number.isFinite(n)) continue;
          classTotals[label] = (classTotals[label] ?? 0) + n;
        }
      }
    }

    return {
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      metrics,
    };
  });

  return Response.json({
    totalDatasets: datasets.length,
    withMetrics,
    coverage: datasets.length ? Number((withMetrics / datasets.length).toFixed(4)) : 0,
    totalSamples,
    avgMissingRate: missingRateCount ? Number((missingRateSum / missingRateCount).toFixed(4)) : 0,
    classDistributionTotal: classTotals,
    latest,
  });
}
