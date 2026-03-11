import { prisma } from '@/lib/prisma';

export default async function WeeklyReportsPage() {
  const reports = await prisma.weeklyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 20 });
  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>周报</h2>
      <p>每周五 12:00 自动生成。</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <a href="/api/reports/export?type=weekly&format=md">导出 Markdown</a>
        <a href="/api/reports/export?type=weekly&format=csv">导出 CSV</a>
        <a href="/api/reports/export?type=weekly&format=json">导出 JSON</a>
      </div>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.weekKey}</li>
        ))}
      </ul>
    </main>
  );
}
