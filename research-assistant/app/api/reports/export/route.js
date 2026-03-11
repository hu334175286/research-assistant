import { prisma } from '@/lib/prisma';
import { filterDailyReports, getDailyReportStatus, REPORT_STATUS } from '@/lib/daily-report-view.mjs';

function safeFormat(input, fallback = 'md') {
  const v = String(input || fallback).toLowerCase();
  return ['md', 'json', 'csv'].includes(v) ? v : fallback;
}

function toCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = headers.join(',');
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(',')).join('\n');
  return `${head}\n${body}`;
}

function withDownloadHeaders(contentType, filename) {
  return {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = String(searchParams.get('type') || 'daily').toLowerCase();
  const format = safeFormat(searchParams.get('format'), 'md');

  if (type === 'weekly') {
    const take = Math.min(Math.max(Number(searchParams.get('take') || 20), 1), 200);
    const reports = await prisma.weeklyReport.findMany({ orderBy: { generatedAt: 'desc' }, take });

    if (format === 'json') {
      return new Response(JSON.stringify({ type, total: reports.length, items: reports }, null, 2), {
        headers: withDownloadHeaders('application/json; charset=utf-8', `weekly-reports-${Date.now()}.json`),
      });
    }

    if (format === 'csv') {
      const csv = toCsv(
        reports.map((r) => ({ weekKey: r.weekKey, generatedAt: r.generatedAt?.toISOString?.() || '', contentMd: r.contentMd || '' })),
        ['weekKey', 'generatedAt', 'contentMd'],
      );
      return new Response(csv, {
        headers: withDownloadHeaders('text/csv; charset=utf-8', `weekly-reports-${Date.now()}.csv`),
      });
    }

    const md = [
      '# Weekly Reports Export',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total: ${reports.length}`,
      '',
      ...reports.map((r) => `## ${r.weekKey}\n\n- generatedAt: ${r.generatedAt?.toISOString?.() || '-'}\n\n${r.contentMd || '_empty_'}\n`),
    ].join('\n');

    return new Response(md, {
      headers: withDownloadHeaders('text/markdown; charset=utf-8', `weekly-reports-${Date.now()}.md`),
    });
  }

  const q = String(searchParams.get('q') || '');
  const statusInput = String(searchParams.get('status') || REPORT_STATUS.ALL);
  const status = Object.values(REPORT_STATUS).includes(statusInput) ? statusInput : REPORT_STATUS.ALL;
  const take = Math.min(Math.max(Number(searchParams.get('take') || 50), 1), 500);

  const all = await prisma.dailyReport.findMany({ orderBy: { generatedAt: 'desc' }, take });
  const reports = filterDailyReports(all, { q, status });

  if (format === 'json') {
    return new Response(JSON.stringify({ type: 'daily', total: reports.length, q, status, items: reports }, null, 2), {
      headers: withDownloadHeaders('application/json; charset=utf-8', `daily-reports-${Date.now()}.json`),
    });
  }

  if (format === 'csv') {
    const csv = toCsv(
      reports.map((r) => ({
        dayKey: r.dayKey,
        generatedAt: r.generatedAt?.toISOString?.() || '',
        status: getDailyReportStatus(r),
        contentShort: r.contentShort || '',
        contentFull: r.contentFull || '',
      })),
      ['dayKey', 'generatedAt', 'status', 'contentShort', 'contentFull'],
    );
    return new Response(csv, {
      headers: withDownloadHeaders('text/csv; charset=utf-8', `daily-reports-${Date.now()}.csv`),
    });
  }

  const md = [
    '# Daily Reports Export',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Filter: q="${q}", status="${status}"`,
    `Total: ${reports.length}`,
    '',
    ...reports.map(
      (r) => `## ${r.dayKey}\n\n- generatedAt: ${r.generatedAt?.toISOString?.() || '-'}\n- status: ${getDailyReportStatus(r)}\n\n### short\n${r.contentShort || '_empty_'}\n\n### full\n${r.contentFull || '_empty_'}\n`,
    ),
  ].join('\n');

  return new Response(md, {
    headers: withDownloadHeaders('text/markdown; charset=utf-8', `daily-reports-${Date.now()}.md`),
  });
}
