import { prisma } from '@/lib/prisma';
import DatasetsClient from './datasets-client';

function pick(values) {
  return [...new Set(values.filter(Boolean))];
}

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

const sorters = {
  newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  sampleCountDesc: (a, b) => (b.metrics?.sampleCount ?? -1) - (a.metrics?.sampleCount ?? -1),
  missingRateDesc: (a, b) => (b.metrics?.missingRate ?? -1) - (a.metrics?.missingRate ?? -1),
};

export default async function DatasetsPage({ searchParams }) {
  const selectedType = typeof searchParams?.type === 'string' ? searchParams.type : '';
  const selectedSource = typeof searchParams?.source === 'string' ? searchParams.source : '';
  const selectedSort = typeof searchParams?.sort === 'string' ? searchParams.sort : 'newest';

  const where = {
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedSource ? { source: selectedSource } : {}),
  };

  const [datasetsRaw, allDatasets] = await Promise.all([
    prisma.dataset.findMany({
      where,
      include: {
        _count: { select: { experiments: true } },
        splits: { orderBy: { split: 'asc' } },
      },
      take: 200,
    }),
    prisma.dataset.findMany({ select: { type: true, source: true } }),
  ]);

  const datasets = datasetsRaw
    .map((d) => ({ ...d, metrics: parseMetrics(d.metricsJson) }))
    .sort(sorters[selectedSort] ?? sorters.newest);

  const typeOptions = pick(allDatasets.map((d) => d.type));
  const sourceOptions = pick(allDatasets.map((d) => d.source));

  return (
    <main style={{ maxWidth: 1100, margin: '20px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>数据集中心</h2>
      <p style={{ color: '#4b5563' }}>统一登记个人上传/生成数据集元数据，并在实验中复用。</p>

      <DatasetsClient
        initialDatasets={datasets}
        typeOptions={typeOptions}
        sourceOptions={sourceOptions}
        selectedType={selectedType}
        selectedSource={selectedSource}
        selectedSort={selectedSort}
      />
    </main>
  );
}
