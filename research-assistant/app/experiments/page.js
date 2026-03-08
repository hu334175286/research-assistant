import { prisma } from '@/lib/prisma';
import ExperimentsClient from './experiments-client';

export const dynamic = 'force-dynamic';

export default async function ExperimentsPage() {
  const [experiments, datasets] = await Promise.all([
    prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { dataset: true },
    }),
    prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, type: true, source: true, version: true },
      take: 200,
    }),
  ]);

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>实验库</h2>
      <p style={{ color: '#4b5563' }}>记录假设、配置、指标、结论，并可关联使用的数据集。</p>
      <ExperimentsClient datasets={datasets} experiments={experiments} />
    </main>
  );
}
