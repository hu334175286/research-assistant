import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const TYPES = ['all', 'paper', 'experiment', 'report'];

function containsText(q) {
  return { contains: q, mode: 'insensitive' };
}

export default async function SearchPage({ searchParams }) {
  const q = (searchParams?.q || '').trim();
  const type = TYPES.includes(searchParams?.type) ? searchParams.type : 'all';

  let papers = [];
  let experiments = [];
  let reports = [];

  if (q) {
    if (type === 'all' || type === 'paper') {
      papers = await prisma.paper.findMany({
        where: { OR: [{ title: containsText(q) }, { source: containsText(q) }, { tags: containsText(q) }] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (type === 'all' || type === 'experiment') {
      experiments = await prisma.experiment.findMany({
        where: { OR: [{ name: containsText(q) }, { hypothesis: containsText(q) }, { conclusion: containsText(q) }] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (type === 'all' || type === 'report') {
      const daily = await prisma.dailyReport.findMany({
        where: { OR: [{ dayKey: containsText(q) }, { contentShort: containsText(q) }, { contentFull: containsText(q) }] },
        orderBy: { generatedAt: 'desc' },
        take: 30,
      });
      const weekly = await prisma.weeklyReport.findMany({
        where: { OR: [{ weekKey: containsText(q) }, { contentMd: containsText(q) }] },
        orderBy: { generatedAt: 'desc' },
        take: 30,
      });
      reports = [
        ...daily.map((r) => ({ id: r.id, key: r.dayKey, type: '日报', preview: r.contentShort || r.contentFull || '' })),
        ...weekly.map((r) => ({ id: r.id, key: r.weekKey, type: '周报', preview: r.contentMd || '' })),
      ];
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>全局搜索</h2>
      <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input name="q" defaultValue={q} placeholder="输入关键词（论文标题/实验/报告）" style={{ flex: '1 1 340px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
        <select name="type" defaultValue={type} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
          <option value="all">全部</option>
          <option value="paper">文献</option>
          <option value="experiment">实验</option>
          <option value="report">报告</option>
        </select>
        <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 8, padding: '10px 14px' }}>搜索</button>
      </form>

      {!q ? <p style={{ color: '#6b7280' }}>输入关键词后开始搜索。</p> : null}

      {q ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>文献（{papers.length}）</h3>
            {papers.length ? papers.map((p) => <div key={p.id} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>{p.title}</div>) : <div style={{ color: '#6b7280' }}>无匹配结果</div>}
          </section>

          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>实验（{experiments.length}）</h3>
            {experiments.length ? experiments.map((e) => <div key={e.id} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>{e.name}</div>) : <div style={{ color: '#6b7280' }}>无匹配结果</div>}
          </section>

          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>报告（{reports.length}）</h3>
            {reports.length ? reports.map((r) => <div key={r.id} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}><strong>{r.type}</strong>：{r.key}<div style={{ color: '#6b7280', fontSize: 13 }}>{String(r.preview).slice(0, 160)}</div></div>) : <div style={{ color: '#6b7280' }}>无匹配结果</div>}
          </section>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}><Link href="/">返回首页</Link></div>
    </main>
  );
}
