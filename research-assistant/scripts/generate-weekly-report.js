const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function weekKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const oneJan = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil((((date - oneJan) / 86400000) + oneJan.getUTCDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const key = weekKey(new Date());
  const paperCount = await prisma.paper.count();
  const expCount = await prisma.experiment.count();

  const contentMd = `# 周报 ${key}\n\n- 累计文献：${paperCount}\n- 累计实验：${expCount}\n- 说明：V1模板周报，后续聚合本周日报并补充洞察。`;

  await prisma.weeklyReport.upsert({
    where: { weekKey: key },
    create: { weekKey: key, contentMd },
    update: { contentMd, generatedAt: new Date() },
  });

  console.log(`Weekly report generated: ${key}`);
}

main().finally(() => prisma.$disconnect());
