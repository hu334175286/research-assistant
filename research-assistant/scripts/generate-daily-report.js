const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const key = dayKey(y);

  const papers = await prisma.paper.count({
    where: { createdAt: { gte: new Date(`${key}T00:00:00.000Z`), lt: new Date(`${key}T23:59:59.999Z`) } },
  });
  const exps = await prisma.experiment.count({
    where: { createdAt: { gte: new Date(`${key}T00:00:00.000Z`), lt: new Date(`${key}T23:59:59.999Z`) } },
  });

  const traceExperiments = await prisma.experiment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { dataset: { select: { name: true } } },
  });

  const linked = traceExperiments.filter((e) => Boolean(e.datasetId)).length;
  const pinned = traceExperiments.filter((e) => Boolean(e.datasetVersionSnapshot)).length;

  const traceLines = traceExperiments.slice(0, 5).map((e) => {
    return `  - ${e.name} | datasetId=${e.datasetId || '-'} | datasetName=${e.dataset?.name || '-'} | snapshot=${e.datasetVersionSnapshot || '-'}`;
  });

  const contentShort = `昨日新增文献 ${papers} 篇，实验 ${exps} 项。`;
  const contentFull = `【${key} 日报】\n- 新增文献：${papers}\n- 新增实验：${exps}\n- 实验-数据集追溯摘要：最近${traceExperiments.length}项中，已关联${linked}项，版本已快照${pinned}项。\n${traceLines.length ? `- 追溯样例：\n${traceLines.join('\n')}` : '- 追溯样例：暂无'}\n- 说明：V1模板日报，后续接入任务与洞察摘要。`;

  await prisma.dailyReport.upsert({
    where: { dayKey: key },
    create: { dayKey: key, contentShort, contentFull },
    update: { contentShort, contentFull, generatedAt: new Date() },
  });

  console.log(`Daily report generated: ${key}`);
}

main().finally(() => prisma.$disconnect());
