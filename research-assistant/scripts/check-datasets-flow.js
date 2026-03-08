#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'automation');
const REPORT_PATH = path.join(REPORT_DIR, 'datasets-flow.md');
const REQUIRED_SPLITS = ['train', 'val', 'test'];

function fmt(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.length
    ? rows.map((row) => `| ${row.map((cell) => fmt(cell)).join(' | ')} |`).join('\n')
    : `| ${headers.map(() => '-').join(' | ')} |`;
  return [head, sep, body].join('\n');
}

async function main() {
  const datasets = await prisma.dataset.findMany({
    include: {
      splits: { orderBy: { split: 'asc' } },
      experiments: {
        select: {
          id: true,
          name: true,
          datasetVersionSnapshot: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const experiments = await prisma.experiment.findMany({
    include: { dataset: { select: { id: true, name: true, version: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const splits = await prisma.datasetSplit.findMany({
    include: { dataset: { select: { id: true, name: true } } },
    orderBy: [{ datasetId: 'asc' }, { split: 'asc' }],
  });

  const failures = [];
  const warnings = [];

  const datasetRows = datasets.map((d) => {
    const splitNames = new Set(d.splits.map((s) => s.split));
    const missingRequired = REQUIRED_SPLITS.filter((name) => !splitNames.has(name));
    const ratioValues = d.splits
      .map((s) => (typeof s.ratio === 'number' ? s.ratio : null))
      .filter((v) => v !== null);
    const ratioSum = ratioValues.reduce((acc, cur) => acc + cur, 0);

    if (d.splits.length === 0) {
      failures.push(`Dataset ${d.id} (${d.name}) 缺少 split 记录`);
    }

    if (missingRequired.length) {
      warnings.push(`Dataset ${d.id} (${d.name}) 缺少 split: ${missingRequired.join(', ')}`);
    }

    if (ratioValues.length > 0 && ratioSum > 1.001) {
      failures.push(`Dataset ${d.id} (${d.name}) split ratio 总和超过 1（当前 ${ratioSum.toFixed(4)}）`);
    }

    return [
      d.id,
      d.name,
      d.version ?? '-',
      d.splits.length,
      d.splits.map((s) => s.split).join(', ') || '-',
      ratioValues.length ? ratioSum.toFixed(4) : '-',
      d.experiments.length,
    ];
  });

  const experimentRows = experiments.map((exp) => {
    const linked = Boolean(exp.datasetId);
    const datasetExists = Boolean(exp.dataset);
    const versionPinned = Boolean(exp.datasetVersionSnapshot);
    const versionMatch =
      exp.dataset && exp.datasetVersionSnapshot
        ? exp.dataset.version === exp.datasetVersionSnapshot
        : null;

    if (linked && !datasetExists) {
      failures.push(`Experiment ${exp.id} (${exp.name}) 指向不存在的数据集 ${exp.datasetId}`);
    }

    if (linked && !versionPinned) {
      failures.push(`Experiment ${exp.id} (${exp.name}) 缺少 datasetVersionSnapshot`);
    }

    if (linked && datasetExists && exp.datasetVersionSnapshot && exp.dataset.version && !versionMatch) {
      failures.push(
        `Experiment ${exp.id} (${exp.name}) datasetVersionSnapshot=${exp.datasetVersionSnapshot} 与 dataset.version=${exp.dataset.version} 不一致`
      );
    }

    if (!linked) {
      warnings.push(`Experiment ${exp.id} (${exp.name}) 未关联 datasetId`);
    }

    return [
      exp.id,
      exp.name,
      exp.datasetId || '-',
      exp.dataset?.name || '-',
      exp.datasetVersionSnapshot || '-',
      linked ? (datasetExists ? 'yes' : 'no') : '-',
      linked ? (versionPinned ? 'yes' : 'no') : '-',
      versionMatch === null ? '-' : versionMatch ? 'yes' : 'no',
    ];
  });

  for (const split of splits) {
    if (!split.dataset) {
      failures.push(`Split ${split.id} (${split.split}) 指向不存在的数据集 ${split.datasetId}`);
    }
  }

  const linkedExpCount = experiments.filter((e) => Boolean(e.datasetId)).length;
  const traceReadyCount = experiments.filter(
    (e) => Boolean(e.datasetId) && Boolean(e.dataset) && Boolean(e.datasetVersionSnapshot)
  ).length;

  const reportLines = [];
  reportLines.push('# Datasets Flow Check Report');
  reportLines.push('');
  reportLines.push(`- GeneratedAt: ${new Date().toISOString()}`);
  reportLines.push(`- Overall: ${failures.length ? 'FAIL' : 'PASS'}`);
  reportLines.push(`- Datasets: ${datasets.length}`);
  reportLines.push(`- Splits: ${splits.length}`);
  reportLines.push(`- Experiments: ${experiments.length}`);
  reportLines.push(`- Linked Experiments: ${linkedExpCount}`);
  reportLines.push(`- Trace Ready (linked + datasetExists + versionPinned): ${traceReadyCount}`);
  reportLines.push('');

  reportLines.push('## Dataset -> Splits Summary');
  reportLines.push('');
  reportLines.push(
    mdTable(['datasetId', 'name', 'version', 'splitCount', 'splits', 'ratioSum', 'linkedExperiments'], datasetRows)
  );
  reportLines.push('');

  reportLines.push('## Experiments -> Dataset Trace Summary');
  reportLines.push('');
  reportLines.push(
    mdTable(
      ['experimentId', 'name', 'datasetId', 'datasetName', 'snapshot', 'datasetExists', 'versionPinned', 'versionMatch'],
      experimentRows
    )
  );
  reportLines.push('');

  reportLines.push('## Findings');
  reportLines.push('');

  if (!failures.length && !warnings.length) {
    reportLines.push('- ✅ 无异常');
  } else {
    if (failures.length) {
      reportLines.push(`### Failures (${failures.length})`);
      for (const item of failures) {
        reportLines.push(`- ❌ ${item}`);
      }
      reportLines.push('');
    }

    if (warnings.length) {
      reportLines.push(`### Warnings (${warnings.length})`);
      for (const item of warnings) {
        reportLines.push(`- ⚠️ ${item}`);
      }
      reportLines.push('');
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join('\n'), 'utf8');

  console.log(`Datasets flow report written: ${REPORT_PATH}`);
  if (failures.length) {
    console.error(`Datasets flow check failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log('Datasets flow check passed.');
  }
}

main()
  .catch((error) => {
    console.error(`Datasets flow check crashed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
