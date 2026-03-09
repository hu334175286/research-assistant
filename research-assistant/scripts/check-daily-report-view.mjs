import assert from 'node:assert/strict';
import { filterDailyReports, getDailyReportStatus, REPORT_STATUS } from '../lib/daily-report-view.mjs';

const reports = [
  { dayKey: '2026-03-09', contentShort: '完成实验A', contentFull: '详细记录：实验A参数与结果' },
  { dayKey: '2026-03-08', contentShort: null, contentFull: '只有全文没有摘要' },
  { dayKey: '2026-03-07', contentShort: '只有摘要', contentFull: null },
];

assert.equal(getDailyReportStatus(reports[0]), REPORT_STATUS.COMPLETE);
assert.equal(getDailyReportStatus(reports[1]), REPORT_STATUS.SUMMARY_MISSING);
assert.equal(getDailyReportStatus(reports[2]), REPORT_STATUS.DETAIL_MISSING);

assert.equal(filterDailyReports(reports, { status: REPORT_STATUS.SUMMARY_MISSING }).length, 1);
assert.equal(filterDailyReports(reports, { q: '实验A' }).length, 1);
assert.equal(filterDailyReports(reports, { q: '2026-03', status: REPORT_STATUS.ALL }).length, 3);

console.log('check:reports OK');
