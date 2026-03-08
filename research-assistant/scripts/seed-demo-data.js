const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ROOT = process.cwd();
const DELIVERY_PATH = path.join(ROOT, 'config', 'delivery-checklist.json');
const TOOLS_PATH = path.join(ROOT, 'config', 'tools.json');
const DEMO_EXAMPLES_PATH = path.join(ROOT, 'config', 'demo-examples.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function seedVisualInsightsDemo() {
  const demoPapers = [
    {
      title: '[DEMO] EdgeTiny-Adapter: 8-bit LoRA Compression for On-device VLM',
      year: 2025,
      source: 'arXiv:auto',
      tags: 'demo,edge-ai,vlm,lora',
      venueTier: 'A',
      summaryJson: JSON.stringify({ abstract: 'Demo paper for visualization.', qualitySignals: ['metric_complete', 'reproducible'] }),
    },
    {
      title: '[DEMO] SwiftQuant-RL: Latency-aware Quantization Policy Search',
      year: 2024,
      source: 'arXiv',
      tags: 'demo,quantization,rl',
      venueTier: 'A',
      summaryJson: JSON.stringify({ abstract: 'Demo paper for trend chart.', qualitySignals: ['ablation', 'public_code'] }),
    },
    {
      title: '[DEMO] TinySafetyBench: Lightweight Hallucination Evaluation Suite',
      year: 2023,
      source: 'manual',
      tags: 'demo,evaluation,safety',
      venueTier: 'B',
      summaryJson: JSON.stringify({ abstract: 'Demo paper for source ratio.', qualitySignals: ['benchmark', 'error_analysis'] }),
    },
  ];

  const realCount = await prisma.paper.count({ where: { NOT: { tags: { contains: 'demo' } } } });
  const existingDemoTitles = new Set((await prisma.paper.findMany({ where: { OR: [{ tags: { contains: 'demo' } }, { title: { startsWith: '[DEMO]' } }] }, select: { title: true } })).map((p) => p.title));

  let inserted = 0;
  if (realCount < 8) {
    for (const item of demoPapers) {
      if (existingDemoTitles.has(item.title)) continue;
      await prisma.paper.create({ data: item });
      inserted += 1;
      if (inserted >= 3) break;
    }
  }

  return { realCount, inserted };
}

function seedDeliveryDemo() {
  const cfg = readJson(DELIVERY_PATH, { project: '个人研究助手', updatedAt: '', items: [] });
  cfg.sourceNote = '本页优先展示真实交付清单；当真实条目不足时，使用 seed:demo 注入带 [DEMO] 标记的模拟样例，便于演示筛选与状态统计。';
  cfg.items = Array.isArray(cfg.items) ? cfg.items : [];

  const realCount = cfg.items.filter((i) => !i.demo).length;
  const demos = [
    {
      id: 'demo-cross-team-sync',
      feature: '[DEMO] 跨团队周会自动摘要同步',
      status: 'in_progress',
      description: '演示条目：模拟跨团队周会纪要自动汇总到报告中心。',
      verifyLinks: ['/reports/weekly', '/api/dashboard-summary'],
      demo: true,
    },
    {
      id: 'demo-alert-drill',
      feature: '[DEMO] 异常告警演练工作流',
      status: 'planned',
      description: '演示条目：模拟模型异常后触发预案和责任人提醒。',
      verifyLinks: ['/quick', '/api/model-health'],
      demo: true,
    },
  ];

  let inserted = 0;
  if (realCount < 20) {
    for (const item of demos) {
      if (cfg.items.some((it) => it.id === item.id)) continue;
      cfg.items.push(item);
      inserted += 1;
    }
    cfg.updatedAt = new Date().toISOString().slice(0, 10);
    writeJson(DELIVERY_PATH, cfg);
  } else {
    writeJson(DELIVERY_PATH, cfg);
  }

  return { realCount, inserted };
}

function seedToolsDemo() {
  const cfg = readJson(TOOLS_PATH, { builtIn: [], externalGroups: [] });
  cfg.sourceNote = '工具中心默认来自真实配置；若演示环境条目不足，seed:demo 会补充少量 [DEMO] 工具，仅用于界面演示。';
  cfg.builtIn = Array.isArray(cfg.builtIn) ? cfg.builtIn : [];
  cfg.externalGroups = Array.isArray(cfg.externalGroups) ? cfg.externalGroups : [];

  const realCount = cfg.builtIn.filter((i) => !i.demo).length;
  const demoBuiltIn = [
    { id: 'demo-litmap', name: '文献脉络图谱 [DEMO]', desc: '演示工具：自动聚类研究主题并绘制演进图。', href: '/visual-insights?source=all', demo: true },
    { id: 'demo-repro-check', name: '复现实验清单助手 [DEMO]', desc: '演示工具：根据论文自动生成复现实验 checklist。', href: '/experiments', demo: true },
  ];

  let inserted = 0;
  if (realCount < 8) {
    for (const item of demoBuiltIn) {
      if (cfg.builtIn.some((it) => it.id === item.id)) continue;
      cfg.builtIn.push(item);
      inserted += 1;
    }
  }

  const demoGroupId = 'demo-sandbox-tools';
  const hasGroup = cfg.externalGroups.some((g) => g.id === demoGroupId);
  if (!hasGroup) {
    cfg.externalGroups.push({
      id: demoGroupId,
      category: '演示沙盒工具',
      items: [
        { id: 'demo-mock-repo', name: 'Mock Research Repo', url: 'https://example.com/mock-research-repo', note: '演示外链：样例数据仓库', demo: true },
      ],
    });
  }

  writeJson(TOOLS_PATH, cfg);
  return { realCount, inserted, addedGroup: !hasGroup };
}

function seedQuickDemo() {
  const cfg = readJson(DEMO_EXAMPLES_PATH, { sourceNote: '', quick: [] });
  cfg.sourceNote = 'Quick 页核心状态取自实时接口；当近期事件较少时，seed:demo 增补少量 [DEMO] 场景，帮助演示运维与路由能力。';
  cfg.quick = Array.isArray(cfg.quick) ? cfg.quick : [];

  const samples = [
    { id: 'quick-demo-failover', title: '模型 429 限流后的自动故障切换', desc: '模拟 codex 限流后切换到备用模型并记录事件。' },
    { id: 'quick-demo-verify', title: '每日 09:00 自动 verify 巡检', desc: '模拟定时验证任务完成后写入最新健康状态。' },
    { id: 'quick-demo-port', title: '端口漂移自愈提示', desc: '模拟 3000 异常时自动建议切换 3124。' },
  ];

  let inserted = 0;
  for (const item of samples) {
    if (cfg.quick.some((it) => it.id === item.id)) continue;
    cfg.quick.push(item);
    inserted += 1;
    if (cfg.quick.length >= 3) break;
  }

  writeJson(DEMO_EXAMPLES_PATH, cfg);
  return { inserted, total: cfg.quick.length };
}

async function main() {
  const visual = await seedVisualInsightsDemo();
  const delivery = seedDeliveryDemo();
  const tools = seedToolsDemo();
  const quick = seedQuickDemo();

  console.log('seed:demo completed');
  console.log({ visual, delivery, tools, quick });
}

main()
  .catch((err) => {
    console.error('seed:demo failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
