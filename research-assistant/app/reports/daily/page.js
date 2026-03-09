import { prisma } from '@/lib/prisma';
import { filterDailyReports, getDailyReportStatus, REPORT_STATUS } from '@/lib/daily-report-view.mjs';

function buildTraceSummary(experiments) {
  const linked = experiments.filter((e) => Boolean(e.datasetId)).length;
  const pinned = experiments.filter((e) => Boolean(e.datasetVersionSnapshot)).length;
  return {
    total: experiments.length,
    linked,
    pinned,
    unlinked: experiments.length - linked,
    unpinned: experiments.length - pinned,
  };
}

const STATUS_OPTIONS = [
  { value: REPORT_STATUS.ALL, label: '全部状态' },
  { value: REPORT_STATUS.COMPLETE, label: '完整' },
  { value: REPORT_STATUS.SUMMARY_MISSING, label: '缺摘要' },
  { value: REPORT_STATUS.DETAIL_MISSING, label: '缺全文' },
];

const STATUS_COLOR = {
  [REPORT_STATUS.COMPLETE]: '#166534',
  [REPORT_STATUS.SUMMARY_MISSING]: '#b45309',
  [REPORT_STATUS.DETAIL_MISSING]: '#1d4ed8',
};

const STATUS_LABEL = {
  [REPORT_STATUS.COMPLETE]: '完整',
  [REPORT_STATUS.SUMMARY_MISSING]: '缺摘要',
  [REPORT_STATUS.DETAIL_MISSING]: '缺全文',
};

export default async function DailyReportsPage({ searchParams }) {
  const params = (await searchParams) || {};
  const q = typeof params.q === 'string' ? params.q : '';
  const statusInput = typeof params.status === 'string' ? params.status : REPORT_STATUS.ALL;
  const status = Object.values(REPORT_STATUS).includes(statusInput) ? statusInput : REPORT_STATUS.ALL;

  const [reports, latestExperiments] = await Promise.all([
    prisma.dailyReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 30 }),
    prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { dataset: { select: { name: true } } },
    }),
  ]);

  const filteredReports = filterDailyReports(reports, { q, status });
  const traceSummary = buildTraceSummary(latestExperiments);

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 24, display: 'grid', gap: 16 }}>
      <section>
        <h2>日报</h2>
        <p>每天 09:00 自动生成（前一日总结）。支持关键词检索与状态筛选，便于快速定位缺失项。</p>

        <form style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="检索日期/摘要/全文关键词"
            style={{ flex: '1 1 280px', padding: '8px 10px' }}
          />
          <select name="status" defaultValue={status} style={{ padding: '8px 10px' }}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '8px 12px' }}>筛选</button>
        </form>

        <p style={{ marginTop: 0, color: '#4b5563' }}>共 {reports.length} 条，当前命中 {filteredReports.length} 条。</p>

        {!filteredReports.length ? (
          <p style={{ color: '#6b7280' }}>当前筛选条件下暂无日报。</p>
        ) : (
          <ul style={{ display: 'grid', gap: 8 }}>
            {filteredReports.map((r) => {
              const reportStatus = getDailyReportStatus(r);
              return (
                <li key={r.id}>
                  <strong>{r.dayKey}</strong> - {r.contentShort || '暂无摘要'}
                  <span style={{ marginLeft: 8, color: STATUS_COLOR[reportStatus], fontWeight: 600 }}>
                    [{STATUS_LABEL[reportStatus]}]
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>实验-数据集追溯摘要</h3>
        <p style={{ marginTop: 0, color: '#4b5563' }}>
          最近 {traceSummary.total} 项实验：已关联数据集 {traceSummary.linked}，版本已快照 {traceSummary.pinned}，未关联 {traceSummary.unlinked}，未快照 {traceSummary.unpinned}。
        </p>
        {!latestExperiments.length ? (
          <p style={{ color: '#6b7280' }}>暂无实验记录。</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {latestExperiments.slice(0, 8).map((e) => (
              <li key={e.id} style={{ fontSize: 14 }}>
                <strong>{e.name}</strong> ｜ datasetId: {e.datasetId || '-'} ｜ datasetName: {e.dataset?.name || '-'} ｜ snapshot: {e.datasetVersionSnapshot || '-'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
