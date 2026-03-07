import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

const QUALITY_OPTIONS = ['all', 'high', 'medium', 'low'];
const SOURCE_OPTIONS = ['all', 'arXiv:auto', 'arXiv', 'manual'];

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

function parseYear(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export default async function VisualInsightsPage({ searchParams }) {
  const sp = await searchParams;
  const quality = QUALITY_OPTIONS.includes(sp?.quality) ? sp.quality : 'all';
  const source = SOURCE_OPTIONS.includes(sp?.source) ? sp.source : 'all';
  const yearFrom = parseYear(sp?.yearFrom);
  const yearTo = parseYear(sp?.yearTo);

  const allPapers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });

  const papers = allPapers.filter((p) => {
    const q = getPaperQuality(p);
    if (quality !== 'all' && q !== quality) return false;

    const s = p.source || '';
    if (source !== 'all') {
      if (source === 'manual' && (s.startsWith('arXiv') || s === 'arXiv:auto')) return false;
      if (source !== 'manual' && s !== source) return false;
    }

    const y = Number(p.year);
    if (yearFrom != null && Number.isFinite(y) && y < yearFrom) return false;
    if (yearTo != null && Number.isFinite(y) && y > yearTo) return false;

    return true;
  });

  const qualityStats = { high: 0, medium: 0, low: 0 };
  const yearStats = new Map();

  for (const p of papers) {
    const q = getPaperQuality(p);
    if (q in qualityStats) qualityStats[q] += 1;

    const y = Number(p.year);
    if (Number.isFinite(y) && y > 0) yearStats.set(y, (yearStats.get(y) || 0) + 1);
  }

  const total = papers.length;
  const trend = [...yearStats.entries()].sort((a, b) => a[0] - b[0]).slice(-10);
  const maxTrend = Math.max(1, ...trend.map(([, v]) => v));

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>科研可视化看板</h2>
      <p style={{ color: '#6b7280' }}>支持按质量、来源、年份区间筛选。</p>

      <form style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select name="quality" defaultValue={quality} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }}>
          {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{qualityLabel(q)}</option>)}
        </select>

        <select name="source" defaultValue={source} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }}>
          <option value="all">全部来源</option>
          <option value="arXiv:auto">自动抓取</option>
          <option value="arXiv">手动 arXiv</option>
          <option value="manual">非 arXiv</option>
        </select>

        <input name="yearFrom" defaultValue={yearFrom ?? ''} placeholder="起始年份" style={{ width: 120, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }} />
        <input name="yearTo" defaultValue={yearTo ?? ''} placeholder="截止年份" style={{ width: 120, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }} />

        <button type="submit" style={{ padding: '8px 12px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff' }}>更新图表</button>
        <Link href="/visual-insights" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', textDecoration: 'none', color: '#374151' }}>重置</Link>
      </form>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>质量分布（当前筛选 {total} 条）</h3>
          <Bar label={qualityLabel('high')} value={qualityStats.high} total={total} color="#22c55e" />
          <Bar label={qualityLabel('medium')} value={qualityStats.medium} total={total} color="#f59e0b" />
          <Bar label={qualityLabel('low')} value={qualityStats.low} total={total} color="#ef4444" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>年份趋势（最近 10 个年份）</h3>
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
