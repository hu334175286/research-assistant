const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const papers = [
  {
    title: 'RF-Pose: Through-Wall Human Pose Estimation Using Radio Signals',
    year: 2018,
    source: 'CVPR 2018 / arXiv:1803.07031',
    tags: 'wireless sensing,RF sensing,pose estimation',
    venueTier: 'A',
    venueMatchedBy: 'manual-curation',
    summaryJson: {
      url: 'https://arxiv.org/abs/1803.07031',
      note: '使用毫米波/无线反射信号进行人体姿态估计，验证无线感知可替代部分视觉场景。'
    }
  },
  {
    title: 'In-Edge AI: Intelligentizing Mobile Edge Computing, Caching and Communication by Deep Reinforcement Learning',
    year: 2019,
    source: 'IEEE Network 2019 / arXiv:1809.07866',
    tags: 'edge intelligence,mec,reinforcement learning',
    venueTier: 'A',
    venueMatchedBy: 'manual-curation',
    summaryJson: {
      url: 'https://arxiv.org/abs/1809.07866',
      note: '经典边缘智能综述/方法论文，讨论在MEC中联合优化计算、缓存与通信。'
    }
  },
  {
    title: 'Communication-Efficient Learning of Deep Networks from Decentralized Data',
    year: 2017,
    source: 'AISTATS 2017 / arXiv:1602.05629',
    tags: 'edge intelligence,federated learning,decentralized learning',
    venueTier: 'A',
    venueMatchedBy: 'manual-curation',
    summaryJson: {
      url: 'https://arxiv.org/abs/1602.05629',
      note: 'FedAvg 奠基论文，为边缘侧分布式训练与通信开销优化提供基础。'
    }
  }
];

const datasets = [
  {
    name: 'UCI HAR Dataset',
    type: 'human activity recognition',
    source: 'https://archive.ics.uci.edu/dataset/240/human+activity+recognition+using+smartphones',
    license: 'CC BY 4.0',
    version: '1.0',
    tags: 'wearable sensing,smartphone,har',
    note: '智能手机惯性传感器活动识别基准数据集。',
    metricsJson: {
      modality: ['accelerometer', 'gyroscope'],
      subjects: 30,
      classes: 6
    }
  },
  {
    name: 'WISDM Smartphone and Smartwatch Activity and Biometrics Dataset',
    type: 'human activity recognition',
    source: 'https://www.cis.fordham.edu/wisdm/dataset.php',
    license: 'CC BY 4.0',
    version: '1.1',
    tags: 'wearable sensing,smartwatch,har',
    note: '手机+手表多传感器活动识别数据集，可用于边缘侧轻量模型验证。',
    metricsJson: {
      modality: ['accelerometer', 'gyroscope'],
      classes: 18
    }
  }
];

async function upsertPaper(item) {
  const exists = await prisma.paper.findFirst({ where: { title: item.title } });
  if (exists) {
    return prisma.paper.update({
      where: { id: exists.id },
      data: {
        year: item.year,
        source: item.source,
        tags: item.tags,
        summaryJson: JSON.stringify(item.summaryJson),
        venueTier: item.venueTier,
        venueMatchedBy: item.venueMatchedBy
      }
    });
  }

  return prisma.paper.create({
    data: {
      ...item,
      summaryJson: JSON.stringify(item.summaryJson)
    }
  });
}

async function upsertDataset(item) {
  const exists = await prisma.dataset.findFirst({ where: { name: item.name } });
  const data = {
    ...item,
    metricsJson: JSON.stringify(item.metricsJson)
  };

  if (exists) {
    return prisma.dataset.update({ where: { id: exists.id }, data });
  }

  return prisma.dataset.create({ data });
}

async function main() {
  const savedPapers = [];
  for (const p of papers) {
    savedPapers.push(await upsertPaper(p));
  }

  const savedDatasets = [];
  for (const d of datasets) {
    savedDatasets.push(await upsertDataset(d));
  }

  const expName = 'Edge-FL-HAR baseline on UCI HAR (traceable demo)';
  const existingExp = await prisma.experiment.findFirst({ where: { name: expName } });

  const linkedDataset = savedDatasets.find((d) => d.name === 'UCI HAR Dataset');
  const linkedPaper = savedPapers.find((p) => p.title.includes('Communication-Efficient Learning'));

  const expData = {
    name: expName,
    hypothesis: '在UCI HAR上，基于FedAvg的边缘训练可在通信受限下保持可接受精度。',
    datasetId: linkedDataset?.id,
    datasetVersionSnapshot: linkedDataset?.version || null,
    configJson: JSON.stringify({
      referencePaper: linkedPaper?.title,
      rounds: 100,
      clients: 10,
      optimizer: 'SGD',
      lr: 0.01,
      batchSize: 32
    }),
    metricsJson: JSON.stringify({
      top1Accuracy: 0.912,
      f1Score: 0.904,
      commRounds: 100
    }),
    conclusion: '示例实验：完成论文-数据集-版本快照的最小可追溯链路。'
  };

  if (existingExp) {
    await prisma.experiment.update({ where: { id: existingExp.id }, data: expData });
  } else {
    await prisma.experiment.create({ data: expData });
  }

  console.log(`papers=${savedPapers.length}, datasets=${savedDatasets.length}, experiments=1 (upsert)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
