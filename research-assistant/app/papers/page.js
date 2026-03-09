import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';
import { ccfTierLabel, resolvePaperCcfTier } from '@/lib/ccf-tier';
import { ui, statusPill } from '@/app/components/unified-ui';

const QUALITY_FILTER_OPTIONS = ['all', 'high', 'medium', 'low'];
const CCF_FILTER_OPTIONS = ['all', 'A', 'B', 'C', 'NA'];
const YEAR_RANGE_OPTIONS = [
  { key: 'all', label: '全部年份', yearFrom: null, yearTo: null },
  { key: '2024+', label: '2024+', yearFrom: 2024, yearTo: null },
  { key: '2020-2023', label: '2020-2023', yearFrom: 2020, yearTo: 2023 },
  { key: '2015-2019', label: '2015-2019', yearFrom: 2015, yearTo: 2019 },
  { key: 'before-2015', label: '2014及更早', yearFrom: null, yearTo: 2014 },
];

function badge(text) {
  return (
    <span style={{ ...statusPill('info'), marginLeft: 8 }}>
      {text}
    </span>
  );
}

function parseYear(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function buildPapersHref({ quality, ccfTier, source, yearFrom, yearTo }) {
  const query = new URLSearchParams();
  if (quality && quality !== 'all') query.set('quality', quality);
  if (ccfTier && ccfTier !== 'all') query.set('ccfTier', ccfTier);
  if (source && source !== 'all') query.set('source', source);
  if (yearFrom != null) query.set('yearFrom', String(yearFrom));
  if (yearTo != null) query.set('yearTo', String(yearTo));
  const q = query.toString();
  return q ? `/papers?${q}` : '/papers';
}

function getYearRangeSummary(yearFrom, yearTo) {
  if (yearFrom == null && yearTo == null) return '全部年份';
  if (yearFrom != null && yearTo != null) return `${yearFrom}-${yearTo}`;
  if (yearFrom != null) return `${yearFrom}+`;
  return `${yearTo}及更早`;
}

function sourceLabel(value) {
  if (value === 'all') return '来源-全部';
  if (value === 'arXiv:auto') return '来源-arXiv:auto';
  if (value === 'arxiv') return '来源-arXiv';
  return `来源-${value}`;
}

export default async function PapersPage({ searchParams }) {
  const sp = await searchParams;
  const qualityRequested = String(sp?.quality || '').toLowerCase();
  const ccfRequested = String(sp?.ccfTier || sp?.ccf || '').toUpperCase();
  const sourceRequested = String(sp?.source || sp?.src || '').trim();

  const yearFromRequested = parseYear(sp?.yearFrom ?? sp?.fromYear ?? sp?.startYear);
  const yearToRequested = parseYear(sp?.yearTo ?? sp?.toYear ?? sp?.endYear);

  const qualityFilter = QUALITY_FILTER_OPTIONS.includes(qualityRequested) ? qualityRequested : 'all';
  const ccfFilter = CCF_FILTER_OPTIONS.includes(ccfRequested) ? ccfRequested : 'all';

  let dbError = null;
  let allPapers = [];
  try {
    allPapers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  } catch {
    dbError = '文献数据读取失败，请检查数据库连接后重试。';
  }

  const enrichedPapers = allPapers.map((p) => ({ ...p, ...resolvePaperCcfTier(p) }));
  const sourceOptions = ['all', ...new Set(enrichedPapers.map((p) => String(p.source || '').trim()).filter(Boolean))];
  const sourceFilter = sourceOptions.includes(sourceRequested) ? sourceRequested : 'all';

  const papers = enrichedPapers.filter((p) => {
    const qualityOk = qualityFilter === 'all' || getPaperQuality(p) === qualityFilter;
    const ccfOk = ccfFilter === 'all' || p.ccfTier === ccfFilter;
    const sourceOk = sourceFilter === 'all' || String(p.source || '').trim() === sourceFilter;

    const y = Number(p.year);
    const yearOkFrom = yearFromRequested == null || !Number.isFinite(y) || y >= yearFromRequested;
    const yearOkTo = yearToRequested == null || !Number.isFinite(y) || y <= yearToRequested;

    return qualityOk && ccfOk && sourceOk && yearOkFrom && yearOkTo;
  });

  const activeSummary = [
    qualityLabel(qualityFilter),
    ccfFilter === 'all' ? 'CCF-全部' : ccfTierLabel(ccfFilter),
    sourceLabel(sourceFilter),
    `年份-${getYearRangeSummary(yearFromRequested, yearToRequested)}`,
  ].join(' · ');

  return (
    <main style={ui.page}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0 }}>文献库</h2>
        <p style={{ margin: '8px 0 0', color: '#475569' }}>左侧筛选，右侧列表。支持手工入库、arXiv 检索和自动抓取文献。</p>
      </header>

      {dbError ? (
        <section style={errorStateStyle}>
          <strong>加载失败</strong>
          <p style={{ margin: '8px 0 0' }}>{dbError}</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>建议先访问 /api/papers 观察接口是否可用，确认后刷新页面。</p>
        </section>
      ) : null}

      <section style={{ ...panelStyle, marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>抓取接口（可直接浏览器访问）</div>
        <code style={codeStyle}>/api/papers/arxiv?q=wireless%20sensing&maxResults=8</code>
        <code style={codeStyle}>/api/papers/auto-fetch</code>
        <code style={codeStyle}>/api/papers/auto-fetch?run=1</code>
      </section>

      <div style={layoutStyle}>
        <aside style={sidebarStyle}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>筛选与导出</div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>按质量筛选</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {QUALITY_FILTER_OPTIONS.map((level) => {
              const active = qualityFilter === level;
              return (
                <Link
                  key={level}
                  href={buildPapersHref({ quality: level, ccfTier: ccfFilter, source: sourceFilter, yearFrom: yearFromRequested, yearTo: yearToRequested })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: active ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: active ? '#eff6ff' : '#fff',
                    color: active ? '#1d4ed8' : '#374151',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {qualityLabel(level)}
                </Link>
              );
            })}
          </div>

          <div style={{ color: '#64748b', fontSize: 13, marginTop: 14, marginBottom: 8 }}>按 CCF 筛选</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {CCF_FILTER_OPTIONS.map((tier) => {
              const active = ccfFilter === tier;
              return (
                <Link
                  key={tier}
                  href={buildPapersHref({ quality: qualityFilter, ccfTier: tier, source: sourceFilter, yearFrom: yearFromRequested, yearTo: yearToRequested })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: active ? '1px solid #7c3aed' : '1px solid #d1d5db',
                    background: active ? '#f5f3ff' : '#fff',
                    color: active ? '#6d28d9' : '#374151',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {tier === 'all' ? '全部' : ccfTierLabel(tier)}
                </Link>
              );
            })}
          </div>

          <div style={{ color: '#64748b', fontSize: 13, marginTop: 14, marginBottom: 8 }}>按来源筛选</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sourceOptions.map((source) => {
              const active = sourceFilter === source;
              return (
                <Link
                  key={source}
                  href={buildPapersHref({ quality: qualityFilter, ccfTier: ccfFilter, source, yearFrom: yearFromRequested, yearTo: yearToRequested })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: active ? '1px solid #0f766e' : '1px solid #d1d5db',
                    background: active ? '#f0fdfa' : '#fff',
                    color: active ? '#0f766e' : '#374151',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {source === 'all' ? '全部来源' : source}
                </Link>
              );
            })}
          </div>

          <div style={{ color: '#64748b', fontSize: 13, marginTop: 14, marginBottom: 8 }}>按年份筛选</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {YEAR_RANGE_OPTIONS.map((option) => {
              const active = yearFromRequested === option.yearFrom && yearToRequested === option.yearTo;
              return (
                <Link
                  key={option.key}
                  href={buildPapersHref({
                    quality: qualityFilter,
                    ccfTier: ccfFilter,
                    source: sourceFilter,
                    yearFrom: option.yearFrom,
                    yearTo: option.yearTo,
                  })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: active ? '1px solid #b45309' : '1px solid #d1d5db',
                    background: active ? '#fffbeb' : '#fff',
                    color: active ? '#92400e' : '#374151',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>当前结果：{papers.length} 条</div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <a href={`/api/papers/bibtex/export?quality=${qualityFilter}&yearFrom=${yearFromRequested ?? ''}&yearTo=${yearToRequested ?? ''}`} style={sideLinkStyle}>导出当前筛选</a>
            <a href="/api/papers/bibtex/export?quality=high&yearFrom=2023&limit=100" style={sideLinkStyle}>导出高质量(2023+)</a>
            <a href="/api/papers/bibtex/export" style={sideLinkStyle}>导出全部 BibTeX</a>
          </div>
        </aside>

        <section style={listPaneStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700 }}>文献列表 · {activeSummary}</div>
            <a href="/api/papers" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 13 }}>查看原始 API</a>
          </div>

          {papers.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {papers.map((p) => {
                const level = getPaperQuality(p);
                return (
                  <article key={p.id} style={paperCardStyle}>
                    <div style={{ fontWeight: 700, lineHeight: 1.4 }}>
                      {p.title}
                      {p.source === 'arXiv:auto' ? badge('自动抓取') : null}
                    </div>
                    <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>
                      年份：{p.year || '-'} ｜ 质量：{qualityLabel(level)} ｜ CCF：{ccfTierLabel(p.ccfTier)} ｜ 来源：{p.source || '-'}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a href={`/papers/${p.id}`} style={actionLinkStyle}>查看详情</a>
                      <a href={`/papers/${p.id}/fulltext`} style={actionLinkStyle}>全文预览</a>
                      <a href={`/api/papers/${p.id}/bibtex`} style={actionLinkStyle}>导出 BibTeX</a>
                      <a href={`/api/papers/${p.id}/figures`} style={actionLinkStyle}>图表分析</a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={emptyStateStyle}>
              <strong>当前筛选条件下暂无文献</strong>
              <p style={{ margin: '8px 0 0' }}>建议操作：1) 放宽质量、CCF、来源或年份筛选；2) 访问 /api/papers/auto-fetch?run=1 抓取新文献；3) 使用“查看原始 API”排查数据是否写入。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const headerStyle = {
  ...ui.cardSoft,
  background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
};

const panelStyle = ui.card;

const codeStyle = {
  display: 'block',
  whiteSpace: 'pre-wrap',
  marginTop: 6,
  fontSize: 13,
  color: '#334155',
};

const layoutStyle = {
  marginTop: 14,
  display: 'grid',
  gridTemplateColumns: '280px 1fr',
  gap: 14,
  alignItems: 'start',
};

const sidebarStyle = {
  ...panelStyle,
  position: 'sticky',
  top: 74,
};

const listPaneStyle = {
  ...panelStyle,
  minHeight: 320,
};

const sideLinkStyle = {
  color: '#1d4ed8',
  textDecoration: 'none',
  fontSize: 13,
};

const paperCardStyle = {
  ...ui.card,
  borderRadius: 12,
  padding: 12,
};

const actionLinkStyle = {
  color: '#1d4ed8',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
};

const emptyStateStyle = ui.empty;

const errorStateStyle = {
  ...ui.error,
  marginTop: 14,
};
