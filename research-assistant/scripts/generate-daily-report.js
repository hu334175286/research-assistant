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

  const contentShort = `昨日新增文献 ${papers} 篇，实验 ${exps} 项。`;
  const contentFull = `【${key} 日报】\n- 新增文献：${papers}\n- 新增实验：${exps}\n- 说明：V1模板日报，后续接入任务与洞察摘要。`;

  await prisma.dailyReport.upsert({
    where: { dayKey: key },
    create: { dayKey: key, contentShort, contentFull },
    update: { contentShort, contentFull, generatedAt: new Date() },
  });

  console.log(`Daily report generated: ${key}`);
}

main().finally(() => prisma.$disconnect());
