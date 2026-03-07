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

function SourcePie({ sourceStats, total }) {
  const colors = {
    auto: '#3b82f6',
    arxiv: '#8b5cf6',
    manual: '#10b981',
  };

  const autoRatio = total > 0 ? (sourceStats.auto / total) * 100 : 0;
  const arxivRatio = total > 0 ? (sourceStats.arxiv / total) * 100 : 0;
  const manualRatio = total > 0 ? (sourceStats.manual / total) * 100 : 0;

  const conic = `conic-gradient(
    ${colors.auto} 0% ${autoRatio}%,
    ${colors.arxiv} ${autoRatio}% ${autoRatio + arxivRatio}%,
    ${colors.manual} ${autoRatio + arxivRatio}% 100%
  )`;

  const legend = [
    { key: 'auto', label: '自动抓取', value: sourceStats.auto, ratio: Math.round(autoRatio), color: colors.auto },
    { key: 'arxiv', label: '手动 arXiv', value: sourceStats.arxiv, ratio: Math.round(arxivRatio), color: colors.arxiv },
    { key: 'manual', label: '非 arXiv', value: sourceStats.manual, ratio: Math.round(manualRatio), color: colors.manual },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 160, height: 160, borderRadius: '50%', background: total ? conic : '#e5e7eb', margin: '0 auto', position: 'relative' }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', fontSize: 12, color: '#6b7280' }}>
          {total}条
        </div>
      </div>
      <div>
        {legend.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              <span>{item.label}</span>
            </div>
            <span style={{ color: '#6b7280' }}>{item.value} ({item.ratio}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityTrendLine({ qualityTrend }) {
  const entries = [...qualityTrend.entries()].sort((a, b) => a[0] - b[0]);
  if (!entries.length) return <div style={{ color: '#6b7280' }}>暂无可用质量趋势数据</div>;

  const years = entries.map(([year]) => year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const allValues = entries.flatMap(([, v]) => [v.high, v.medium, v.low]);
  const maxValue = Math.max(1, ...allValues);

  const width = 560;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const xPos = (year) => {
    if (maxYear === minYear) return padX + plotW / 2;
    return padX + ((year - minYear) / (maxYear - minYear)) * plotW;
  };

  const yPos = (value) => padY + (1 - value / maxValue) * plotH;

  const toPath = (key) => entries.map(([year, val], idx) => `${idx === 0 ? 'M' : 'L'} ${xPos(year)} ${yPos(val[key])}`).join(' ');

  const lines = [
    { key: 'high', label: '高质量', color: '#16a34a' },
    { key: 'medium', label: '中质量', color: '#f59e0b' },
    { key: 'low', label: '低质量', color: '#ef4444' },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: width, height: 'auto', background: '#f8fafc', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padY + tick * plotH;
          return <line key={tick} x1={padX} y1={y} x2={width - padX} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}

        {entries.map(([year]) => {
          const x = xPos(year);
          return (
            <g key={year}>
              <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#f1f5f9" strokeWidth="1" />
              <text x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{year}</text>
            </g>
          );
        })}

        {lines.map((line) => (
          <g key={line.key}>
            <path d={toPath(line.key)} fill="none" stroke={line.color} strokeWidth="2.5" />
            {entries.map(([year, val]) => (
              <circle key={`${line.key}-${year}`} cx={xPos(year)} cy={yPos(val[line.key])} r="3" fill={line.color} />
            ))}
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
        {lines.map((line) => (
          <span key={line.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, borderRadius: 999, background: line.color, display: 'inline-block' }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function parseYear(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function isSourceMatched(sourceFilter, sourceValue = '') {
  if (sourceFilter === 'all') return true;
  if (sourceFilter === 'manual') return !(sourceValue.startsWith('arXiv') || sourceValue === 'arXiv:auto');
  return sourceValue === sourceFilter;
}

function buildCsvHref({ quality, source, yearFrom, yearTo }) {
  const params = new URLSearchParams();
  if (quality && quality !== 'all') params.set('quality', quality);
  if (source && source !== 'all') params.set('source', source);
  if (yearFrom != null) params.set('yearFrom', String(yearFrom));
  if (yearTo != null) params.set('yearTo', String(yearTo));
  return `/api/visual-insights/export?${params.toString()}`;
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

    if (!isSourceMatched(source, p.source || '')) return false;

    const y = Number(p.year);
    if (yearFrom != null && Number.isFinite(y) && y < yearFrom) return false;
    if (yearTo != null && Number.isFinite(y) && y > yearTo) return false;

    return true;
  });

  const qualityStats = { high: 0, medium: 0, low: 0 };
  const sourceStats = { auto: 0, arxiv: 0, manual: 0 };
  const qualityTrend = new Map();

  for (const p of papers) {
    const q = getPaperQuality(p);
    if (q in qualityStats) qualityStats[q] += 1;

    const s = p.source || '';
    if (s === 'arXiv:auto') sourceStats.auto += 1;
    else if (s === 'arXiv') sourceStats.arxiv += 1;
    else sourceStats.manual += 1;

    const y = Number(p.year);
    if (Number.isFinite(y) && y > 0) {
      const current = qualityTrend.get(y) || { high: 0, medium: 0, low: 0 };
      current[q] += 1;
      qualityTrend.set(y, current);
    }
  }

  const total = papers.length;
  const csvHref = buildCsvHref({ quality, source, yearFrom, yearTo });

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
        <a href={csvHref} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #93c5fd', background: '#eff6ff', textDecoration: 'none', color: '#1d4ed8', marginLeft: 'auto' }}>
          导出当前筛选为 CSV
        </a>
      </form>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>质量分布（当前筛选 {total} 条）</h3>
          <p style={{ marginTop: 0, marginBottom: 12, color: '#6b7280', fontSize: 13 }}>用于快速判断当前文献池的“可复用度”：高质量占比越高，后续实验落地成本通常越低。</p>
          <Bar label={qualityLabel('high')} value={qualityStats.high} total={total} color="#22c55e" />
          <Bar label={qualityLabel('medium')} value={qualityStats.medium} total={total} color="#f59e0b" />
          <Bar label={qualityLabel('low')} value={qualityStats.low} total={total} color="#ef4444" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>来源占比（当前筛选）</h3>
          <p style={{ marginTop: 0, marginBottom: 12, color: '#6b7280', fontSize: 13 }}>观察自动抓取与人工录入的结构比例，帮助你评估数据来源稳定性与人工维护负担。</p>
          <SourcePie sourceStats={sourceStats} total={total} />
        </div>
      </section>

      <section style={{ marginTop: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>质量趋势折线（按年份）</h3>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#6b7280', fontSize: 13 }}>对比不同年份的高/中/低质量文献数量变化，识别研究方向质量是否在持续改善。</p>
        <QualityTrendLine qualityTrend={qualityTrend} />
      </section>
    </main>
  );
}
