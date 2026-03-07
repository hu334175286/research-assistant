import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

const TYPES = ['all', 'paper', 'experiment', 'report'];

function containsText(q) {
  return { contains: q, mode: 'insensitive' };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getKeywords(query) {
  return Array.from(new Set(String(query || '').trim().split(/\s+/).filter(Boolean))).slice(0, 8);
}

function highlight(text, query) {
  const raw = String(text || '');
  const keywords = getKeywords(query);
  if (!keywords.length) return raw;

  const escaped = keywords.map(escapeRegExp).filter(Boolean);
  if (!escaped.length) return raw;

  const lowerSet = new Set(keywords.map((k) => k.toLowerCase()));
  const regex = new RegExp(`(${escaped.join('|')})`, 'ig');
  const parts = raw.split(regex);

  return parts.map((part, index) => {
    if (lowerSet.has(part.toLowerCase())) {
      return (
        <mark key={`${part}-${index}`} style={{ background: '#fef08a', padding: '0 2px', borderRadius: 3 }}>
          {part}
        </mark>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function toPreview(text, maxLen = 280) {
  const s = String(text || '').trim();
  if (!s) return '暂无摘要';
  return s.length > maxLen ? `${s.slice(0, maxLen)}...` : s;
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

  let recentPapers = [];
  let recentReports = [];

  if (!q) {
    recentPapers = await prisma.paper.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, title: true, summaryJson: true, venueTier: true, source: true },
    });

    const [dailyRecent, weeklyRecent] = await Promise.all([
      prisma.dailyReport.findMany({
        orderBy: { generatedAt: 'desc' },
        take: 4,
        select: { id: true, dayKey: true, contentShort: true, contentFull: true },
      }),
      prisma.weeklyReport.findMany({
        orderBy: { generatedAt: 'desc' },
        take: 4,
        select: { id: true, weekKey: true, contentMd: true },
      }),
    ]);

    recentReports = [
      ...dailyRecent.map((r) => ({ id: `daily-${r.id}`, type: '日报', key: r.dayKey, preview: r.contentShort || r.contentFull || '' })),
      ...weeklyRecent.map((r) => ({ id: `weekly-${r.id}`, type: '周报', key: r.weekKey, preview: r.contentMd || '' })),
    ].slice(0, 8);
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

      {!q ? (
        <section style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px' }}>最近内容</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>最近文献</div>
              {recentPapers.length ? (
                recentPapers.map((p) => {
                  const quality = getPaperQuality(p);
                  return (
                    <div key={p.id} style={{ padding: '6px 0', borderTop: '1px solid #edf2f7' }}>
                      <Link href={`/papers?quality=${quality}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                        {p.title}
                      </Link>
                      <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 12 }}>→ {qualityLabel(quality)}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#6b7280' }}>暂无最近文献</div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>最近报告</div>
              {recentReports.length ? (
                recentReports.map((r) => (
                  <details key={r.id} style={{ padding: '6px 0', borderTop: '1px solid #edf2f7' }}>
                    <summary style={{ cursor: 'pointer' }}>
                      <strong>{r.type}</strong>：{r.key}
                    </summary>
                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: 13 }}>{toPreview(r.preview, 220)}</div>
                  </details>
                ))
              ) : (
                <div style={{ color: '#6b7280' }}>暂无最近报告</div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {q ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>文献（{papers.length}）</h3>
            {papers.length ? (
              papers.map((p) => {
                const quality = getPaperQuality(p);
                return (
                  <div key={p.id} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                    <Link href={`/papers?quality=${quality}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                      {highlight(p.title, q)}
                    </Link>
                    <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 12 }}>→ {qualityLabel(quality)}</span>
                    {(p.source || p.tags) ? (
                      <div style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>
                        {p.source ? <span>来源：{highlight(p.source, q)}</span> : null}
                        {p.tags ? <span style={{ marginLeft: 8 }}>标签：{highlight(p.tags, q)}</span> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#6b7280' }}>无匹配结果</div>
            )}
          </section>

          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>实验（{experiments.length}）</h3>
            {experiments.length ? (
              experiments.map((e) => (
                <details key={e.id} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                  <summary style={{ cursor: 'pointer' }}>{highlight(e.name, q)}</summary>
                  <div style={{ marginTop: 6, color: '#6b7280', fontSize: 13 }}>
                    <div><strong>假设：</strong>{highlight(toPreview(e.hypothesis, 200), q)}</div>
                    <div style={{ marginTop: 4 }}><strong>结论：</strong>{highlight(toPreview(e.conclusion, 220), q)}</div>
                  </div>
                </details>
              ))
            ) : (
              <div style={{ color: '#6b7280' }}>无匹配结果</div>
            )}
          </section>

          <section style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px' }}>报告（{reports.length}）</h3>
            {reports.length ? (
              reports.map((r) => (
                <details key={`${r.type}-${r.id}`} style={{ padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    <strong>{r.type}</strong>：{highlight(r.key, q)}
                  </summary>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>{highlight(toPreview(r.preview, 320), q)}</div>
                </details>
              ))
            ) : (
              <div style={{ color: '#6b7280' }}>无匹配结果</div>
            )}
          </section>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}><Link href="/">返回首页</Link></div>
    </main>
  );
}
