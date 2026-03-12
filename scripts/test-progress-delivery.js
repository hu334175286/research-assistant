const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

const DeliveryManager = require('../src/reporters/delivery');
const ProgressReporter = require('../src/reporters/progress');

async function run() {
  const repoRoot = path.join(__dirname, '..');
  const reportsDir = path.join(repoRoot, 'reports');
  const dataDir = path.join(repoRoot, 'data');

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  // 1) 质量桶统计存在性（确保进展报告含质量分层）
  const reporter = new ProgressReporter();
  const report = await reporter.generateReport({ includePapers: false, includeStats: true });
  assert.ok(report.statistics.byQualityBucket, '进展报告缺少 byQualityBucket 统计');

  // 2) 稳定投递：第一次成功，第二次幂等跳过
  const delivery = new DeliveryManager();
  const payload = {
    report: {
      generatedAt: new Date('2026-03-13T01:30:00.000Z').toISOString(),
      summary: { totalPapers: 12, highPriority: 3 },
      statistics: report.statistics,
      highlights: []
    },
    savedFiles: ['reports/latest-report.txt'],
    textSummary: 'test summary'
  };

  const first = await delivery.deliver(payload);
  assert.ok(first.delivered || first.skipped, '首次投递未执行');

  const second = await delivery.deliver(payload);
  assert.strictEqual(second.skipped, true, '重复投递未触发幂等跳过');
  assert.strictEqual(second.reason, 'already-delivered', '幂等跳过原因不正确');

  console.log('✅ progress + delivery 测试通过');
}

run().catch(err => {
  console.error('❌ progress + delivery 测试失败:', err.message);
  process.exit(1);
});
