import { prisma } from '@/lib/prisma';
import DatasetsClient from './datasets-client';

function pick(values) {
  return [...new Set(values.filter(Boolean))];
}

export default async function DatasetsPage({ searchParams }) {
  const selectedType = typeof searchParams?.type === 'string' ? searchParams.type : '';
  const selectedSource = typeof searchParams?.source === 'string' ? searchParams.source : '';

  const where = {
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedSource ? { source: selectedSource } : {}),
  };

  const [datasets, allDatasets] = await Promise.all([
    prisma.dataset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { experiments: true } } },
      take: 100,
    }),
    prisma.dataset.findMany({ select: { type: true, source: true } }),
  ]);

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
      />
    </main>
  );
}
