import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';
import { ccfTierLabel, resolvePaperCcfTier } from '@/lib/ccf-tier';

const QUALITY_FILTER_OPTIONS = ['all', 'high', 'medium', 'low'];
const CCF_FILTER_OPTIONS = ['all', 'A', 'B', 'C', 'NA'];

function badge(text, bg = '#eef2ff', color = '#3730a3') {
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>
      {text}
    </span>
  );
}

function buildPapersHref({ quality, ccfTier }) {
  const query = new URLSearchParams();
  if (quality && quality !== 'all') query.set('quality', quality);
  if (ccfTier && ccfTier !== 'all') query.set('ccfTier', ccfTier);
  const q = query.toString();
  return q ? `/papers?${q}` : '/papers';
}

export default async function PapersPage({ searchParams }) {
  const sp = await searchParams;
  const qualityRequested = sp?.quality;
  const ccfRequested = String(sp?.ccfTier || '').toUpperCase();
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

  const papers = enrichedPapers.filter((p) => {
    const qualityOk = qualityFilter === 'all' || getPaperQuality(p) === qualityFilter;
    const ccfOk = ccfFilter === 'all' || p.ccfTier === ccfFilter;
    return qualityOk && ccfOk;
  });

  return (
    <main style={{ maxWidth: 1200, margin: '20px auto', padding: 24 }}>
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
                  href={buildPapersHref({ quality: level, ccfTier: ccfFilter })}
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
                  href={buildPapersHref({ quality: qualityFilter, ccfTier: tier })}
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

          <div style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>当前结果：{papers.length} 条</div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <a href={`/api/papers/bibtex/export?quality=${qualityFilter}`} style={sideLinkStyle}>导出当前筛选</a>
            <a href="/api/papers/bibtex/export?quality=high&yearFrom=2023&limit=100" style={sideLinkStyle}>导出高质量(2023+)</a>
            <a href="/api/papers/bibtex/export" style={sideLinkStyle}>导出全部 BibTeX</a>
          </div>
        </aside>

        <section style={listPaneStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700 }}>文献列表 · {qualityLabel(qualityFilter)} · {ccfFilter === 'all' ? 'CCF-全部' : ccfTierLabel(ccfFilter)}</div>
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
              <p style={{ margin: '8px 0 0' }}>你可以：1) 切换左侧筛选等级；2) 访问 /api/papers/auto-fetch?run=1 抓取新文献；3) 回到 all 查看全量数据。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const headerStyle = {
  background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 16,
};

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 14,
};

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
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 12,
  background: '#fff',
};

const actionLinkStyle = {
  color: '#1d4ed8',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
};

const emptyStateStyle = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  borderRadius: 12,
  padding: 14,
  color: '#9a3412',
};

const errorStateStyle = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 14,
  marginTop: 14,
  color: '#991b1b',
};
