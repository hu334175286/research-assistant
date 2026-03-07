import { prisma } from '@/lib/prisma';

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const [todoTasks, weekExps, weekPapers, latestWeekly] = await Promise.all([
    prisma.task.count({ where: { status: { in: ['todo', 'doing', 'blocked'] } } }),
    prisma.experiment.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.paper.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.weeklyReport.findFirst({ orderBy: { generatedAt: 'desc' } }),
  ]);

  const thisWeek = weekKey();
  const weeklyStatus = latestWeekly?.weekKey === thisWeek ? '已生成' : '未生成';

  return (
    <main style={{ maxWidth: 1100, margin: '20px auto', padding: 24 }}>
      <h2>研究指挥台</h2>
      <p>今日重点：文献导入、实验记录、日报预览。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Card title="待办任务" value={String(todoTasks)} />
        <Card title="近7天文献" value={String(weekPapers)} />
        <Card title="近7天实验" value={String(weekExps)} />
        <Card title="周报状态" value={weeklyStatus} />
      </div>
    </main>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ color: '#666', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
