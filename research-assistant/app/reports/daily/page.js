import { prisma } from '@/lib/prisma';

export default async function DailyReportsPage() {
  const reports = await prisma.dailyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 30 });
  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>日报</h2>
      <p>每天 09:00 自动生成（前一日总结）。</p>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.dayKey} - {r.contentShort || '暂无摘要'}</li>
        ))}
      </ul>
    </main>
  );
}
