import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

function badge(text, bg = '#eef2ff', color = '#3730a3') {
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>
      {text}
    </span>
  );
}

const FILTER_OPTIONS = ['all', 'high', 'medium', 'low'];

export default async function PapersPage({ searchParams }) {
  const requested = searchParams?.quality;
  const qualityFilter = FILTER_OPTIONS.includes(requested) ? requested : 'all';

  const allPapers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  const papers = allPapers.filter((p) => qualityFilter === 'all' || getPaperQuality(p) === qualityFilter);

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>文献库</h2>
      <p>支持手工入库、arXiv 检索以及方向自动抓取（含去重与质量分层）。</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, margin: '12px 0 18px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>抓取接口（可直接浏览器访问）</div>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>/api/papers/arxiv?q=wireless%20sensing&maxResults=8</code>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6 }}>/api/papers/auto-fetch</code>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6 }}>/api/papers/auto-fetch?run=1</code>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#4b5563', fontSize: 14 }}>按质量筛选：</span>
        {FILTER_OPTIONS.map((level) => {
          const active = qualityFilter === level;
          return (
            <Link
              key={level}
              href={level === 'all' ? '/papers' : `/papers?quality=${level}`}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: active ? '1px solid #2563eb' : '1px solid #d1d5db',
                background: active ? '#eff6ff' : '#fff',
                color: active ? '#1d4ed8' : '#374151',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {qualityLabel(level)}
            </Link>
          );
        })}
        <span style={{ color: '#6b7280', fontSize: 13 }}>共 {papers.length} 条</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={`/api/papers/bibtex/export?quality=${qualityFilter}`}
            style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}
          >
            导出当前筛选
          </a>
          <a
            href="/api/papers/bibtex/export?quality=high&yearFrom=2023&limit=100"
            style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}
          >
            导出高质量(2023+)
          </a>
          <a
            href="/api/papers/bibtex/export"
            style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}
          >
            导出全部 BibTeX
          </a>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>标题</th>
              <th style={{ padding: 12, width: 90 }}>年份</th>
              <th style={{ padding: 12, width: 120 }}>质量层级</th>
              <th style={{ padding: 12, width: 180 }}>来源</th>
              <th style={{ padding: 12, width: 130 }}>引用导出</th>
              <th style={{ padding: 12, width: 120 }}>图表分析</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => {
              const level = getPaperQuality(p);
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>
                    {p.title}
                    {p.source === 'arXiv:auto' ? badge('自动抓取') : null}
                  </td>
                  <td style={{ padding: 12 }}>{p.year || '-'}</td>
                  <td style={{ padding: 12 }}>{qualityLabel(level)}</td>
                  <td style={{ padding: 12 }}>{p.source || '-'}</td>
                  <td style={{ padding: 12 }}>
                    <a href={`/api/papers/${p.id}/bibtex`} style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 13 }}>
                      导出 BibTeX
                    </a>
                  </td>
                  <td style={{ padding: 12 }}>
                    <a href={`/api/papers/${p.id}/figures`} style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 13 }}>
                      图表分析
                    </a>
                  </td>
                </tr>
              );
            })}
            {!papers.length ? (
              <tr>
                <td style={{ padding: 16, color: '#6b7280' }} colSpan={6}>
                  当前筛选条件下暂无文献。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
