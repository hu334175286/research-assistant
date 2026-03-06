import { prisma } from '@/lib/prisma';

export default async function WeeklyReportsPage() {
  const reports = await prisma.weeklyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 20 });
  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>周报</h2>
      <p>每周五 12:00 自动生成。</p>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.weekKey}</li>
        ))}
      </ul>
    </main>
  );
}
