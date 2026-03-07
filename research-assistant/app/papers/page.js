import { prisma } from '@/lib/prisma';

export default async function PapersPage() {
  const papers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>文献库</h2>
      <p>当前支持：手工入库 API + arXiv 在线检索接口。</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, margin: '12px 0 18px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>抓取接口（可直接浏览器访问）</div>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
          /api/papers/arxiv?q=wireless%20sensing&maxResults=8
        </code>
        <code style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6 }}>
          /api/papers/auto-fetch
        </code>
      </div>

      <ul>
        {papers.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            {p.title} {p.year ? `(${p.year})` : ''}
          </li>
        ))}
      </ul>
    </main>
  );
}
