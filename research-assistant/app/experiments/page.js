import { prisma } from '@/lib/prisma';

export default async function ExperimentsPage() {
  const experiments = await prisma.experiment.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>实验库</h2>
      <p>记录假设、配置、指标、结论，支持失败归因。</p>
      <ul>
        {experiments.map((e) => (
          <li key={e.id}>{e.name}</li>
        ))}
      </ul>
    </main>
  );
}
