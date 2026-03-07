import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

function Bar({ label, value, total, color }) {
  const ratio = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{label}</span>
        <span>{value} ({ratio}%)</span>
      </div>
      <div style={{ height: 10, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${ratio}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export default async function VisualInsightsPage() {
  const papers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });

  const qualityStats = { high: 0, medium: 0, low: 0 };
  const yearStats = new Map();

  for (const p of papers) {
    const q = getPaperQuality(p);
    if (q in qualityStats) qualityStats[q] += 1;

    const y = Number(p.year);
    if (Number.isFinite(y) && y > 0) {
      yearStats.set(y, (yearStats.get(y) || 0) + 1);
    }
  }

  const total = papers.length;
  const trend = [...yearStats.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-8);

  const maxTrend = Math.max(1, ...trend.map(([, v]) => v));

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>科研可视化看板</h2>
      <p style={{ color: '#6b7280' }}>用于快速查看文献质量分布与年份趋势（近 200 条）。</p>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>质量分布</h3>
          <Bar label={qualityLabel('high')} value={qualityStats.high} total={total} color="#22c55e" />
          <Bar label={qualityLabel('medium')} value={qualityStats.medium} total={total} color="#f59e0b" />
          <Bar label={qualityLabel('low')} value={qualityStats.low} total={total} color="#ef4444" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>年份趋势（条形）</h3>
          {!trend.length ? (
            <div style={{ color: '#6b7280' }}>暂无年份数据</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 170 }}>
              {trend.map(([year, count]) => {
                const h = Math.max(8, Math.round((count / maxTrend) * 130));
                return (
                  <div key={year} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{count}</div>
                    <div style={{ height: h, background: '#60a5fa', borderRadius: '8px 8px 0 0' }} />
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{year}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
