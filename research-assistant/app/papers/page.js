import { prisma } from '@/lib/prisma';

function badge(text, bg = '#eef2ff', color = '#3730a3') {
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>
      {text}
    </span>
  );
}

export default async function PapersPage() {
  const papers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 80 });

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>文献库</h2>
      <p>当前支持：手工入库 + arXiv 检索 + 方向自动抓取入库（去重）。</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, margin: '12px 0 18px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>抓取接口（可直接浏览器访问）</div>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>/api/papers/arxiv?q=wireless%20sensing&maxResults=8</code>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6 }}>/api/papers/auto-fetch</code>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6 }}>/api/papers/auto-fetch?run=1</code>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>标题</th>
              <th style={{ padding: 12, width: 90 }}>年份</th>
              <th style={{ padding: 12, width: 180 }}>来源</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12 }}>
                  {p.title}
                  {p.source === 'arXiv:auto' ? badge('auto') : null}
                </td>
                <td style={{ padding: 12 }}>{p.year || '-'}</td>
                <td style={{ padding: 12 }}>{p.source || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
