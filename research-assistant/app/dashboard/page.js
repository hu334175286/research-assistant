import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel } from '@/lib/paper-quality';

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todoTasks, weekExps, weekPapers, latestWeekly, todayAutoFetched, latestAutoFetched, recentPapers] = await Promise.all([
    prisma.task.count({ where: { status: { in: ['todo', 'doing', 'blocked'] } } }),
    prisma.experiment.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.paper.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.weeklyReport.findFirst({ orderBy: { generatedAt: 'desc' } }),
    prisma.paper.count({ where: { source: 'arXiv:auto', createdAt: { gte: todayStart } } }),
    prisma.paper.findMany({ where: { source: 'arXiv:auto' }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.paper.findMany({ orderBy: { createdAt: 'desc' }, take: 150 }),
  ]);

  const qualityStats = { high: 0, medium: 0, low: 0 };
  for (const p of recentPapers) {
    const level = getPaperQuality(p);
    qualityStats[level] += 1;
  }

  const latestHighQuality = recentPapers
    .filter((p) => getPaperQuality(p) === 'high')
    .slice(0, 5);

  const thisWeek = weekKey();
  const weeklyStatus = latestWeekly?.weekKey === thisWeek ? '已生成' : '未生成';

  return (
    <main style={{ maxWidth: 1100, margin: '20px auto', padding: 24 }}>
      <h2>研究指挥台</h2>
      <p>今日重点：文献导入、实验记录、日报预览。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <Card title="待办任务" value={String(todoTasks)} />
        <Card title="近7天文献" value={String(weekPapers)} />
        <Card title="近7天实验" value={String(weekExps)} />
        <Card title="周报状态" value={weeklyStatus} />
        <Card title="今日自动抓取" value={String(todayAutoFetched)} />
      </div>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>文献质量分层（最近 150 条）</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Card title="高质量" value={String(qualityStats.high)} accent="#166534" />
          <Card title="中质量" value={String(qualityStats.medium)} accent="#92400e" />
          <Card title="低质量" value={String(qualityStats.low)} accent="#1f2937" />
        </div>
      </section>

      <section style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>最近高质量论文（Top 5）</h3>
        {latestHighQuality.length ? (
          <ol>
            {latestHighQuality.map((p) => (
              <li key={p.id} style={{ marginBottom: 8 }}>
                {p.title}
                <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 13 }}>
                  （{p.year || '-'}，{qualityLabel(getPaperQuality(p))}）
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: '#6b7280' }}>暂无高质量论文，请先抓取或录入更多文献。</p>
        )}
      </section>

      <section style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>最新自动抓取（Top 5）</h3>
        <ol>
          {latestAutoFetched.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>{p.title}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Card({ title, value, accent = '#111827' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ color: '#666', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: accent }}>{value}</div>
    </div>
  );
}
