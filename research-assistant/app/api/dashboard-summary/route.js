import { prisma } from '@/lib/prisma';

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function GET() {
  const [todoTasks, weekExps, weekPapers, latestWeekly] = await Promise.all([
    prisma.task.count({ where: { status: { in: ['todo', 'doing', 'blocked'] } } }),
    prisma.experiment.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.paper.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.weeklyReport.findFirst({ orderBy: { generatedAt: 'desc' } }),
  ]);

  const currentWeek = weekKey();
  const weeklyStatus = latestWeekly?.weekKey === currentWeek ? '已生成' : '未生成';

  return Response.json({
    todoTasks,
    weekExps,
    weekPapers,
    weeklyStatus,
    currentWeek,
    latestWeekly,
  });
}
