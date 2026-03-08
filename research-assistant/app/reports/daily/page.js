import { prisma } from '@/lib/prisma';

function buildTraceSummary(experiments) {
  const linked = experiments.filter((e) => Boolean(e.datasetId)).length;
  const pinned = experiments.filter((e) => Boolean(e.datasetVersionSnapshot)).length;
  return {
    total: experiments.length,
    linked,
    pinned,
    unlinked: experiments.length - linked,
    unpinned: experiments.length - pinned,
  };
}

export default async function DailyReportsPage() {
  const [reports, latestExperiments] = await Promise.all([
    prisma.dailyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 30 }),
    prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { dataset: { select: { name: true } } },
    }),
  ]);

  const traceSummary = buildTraceSummary(latestExperiments);

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24, display: 'grid', gap: 16 }}>
      <section>
        <h2>日报</h2>
        <p>每天 09:00 自动生成（前一日总结）。</p>
        <ul>
          {reports.map((r) => (
            <li key={r.id}>{r.dayKey} - {r.contentShort || '暂无摘要'}</li>
          ))}
        </ul>
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>实验-数据集追溯摘要</h3>
        <p style={{ marginTop: 0, color: '#4b5563' }}>
          最近 {traceSummary.total} 项实验：已关联数据集 {traceSummary.linked}，版本已快照 {traceSummary.pinned}，未关联 {traceSummary.unlinked}，未快照 {traceSummary.unpinned}。
        </p>
        {!latestExperiments.length ? (
          <p style={{ color: '#6b7280' }}>暂无实验记录。</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {latestExperiments.slice(0, 8).map((e) => (
              <li key={e.id} style={{ fontSize: 14 }}>
                <strong>{e.name}</strong> ｜ datasetId: {e.datasetId || '-'} ｜ datasetName: {e.dataset?.name || '-'} ｜ snapshot: {e.datasetVersionSnapshot || '-'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
