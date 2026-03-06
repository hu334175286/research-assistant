import { prisma } from '@/lib/prisma';

export default async function PapersPage() {
  const papers = await prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24 }}>
      <h2>文献库</h2>
      <p>支持来源：PDF/Zotero/arXiv/手工/网络抓取（后续接入）。</p>
      <ul>
        {papers.map((p) => (
          <li key={p.id}>{p.title} {p.year ? `(${p.year})` : ''}</li>
        ))}
      </ul>
    </main>
  );
}
