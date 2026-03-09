export const REPORT_STATUS = {
  ALL: 'all',
  COMPLETE: 'complete',
  SUMMARY_MISSING: 'summary-missing',
  DETAIL_MISSING: 'detail-missing',
};

export function getDailyReportStatus(report) {
  const hasSummary = Boolean(report?.contentShort?.trim());
  const hasDetail = Boolean(report?.contentFull?.trim());

  if (hasSummary && hasDetail) return REPORT_STATUS.COMPLETE;
  if (!hasSummary) return REPORT_STATUS.SUMMARY_MISSING;
  return REPORT_STATUS.DETAIL_MISSING;
}

export function filterDailyReports(reports, { q = '', status = REPORT_STATUS.ALL } = {}) {
  const keyword = String(q || '').trim().toLowerCase();
  return reports.filter((report) => {
    const reportStatus = getDailyReportStatus(report);
    if (status !== REPORT_STATUS.ALL && reportStatus !== status) return false;

    if (!keyword) return true;
    const haystack = [report.dayKey, report.contentShort, report.contentFull]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
}
