#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'automation');
const REPORT_PATH = path.join(REPORT_DIR, 'ccf-coverage.md');

function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function loadCcfConfig() {
  const filePath = path.join(ROOT, 'config', 'ccf-venues.json');
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function parseSummaryJson(summaryJson) {
  if (!summaryJson) return {};
  try {
    return JSON.parse(summaryJson);
  } catch {
    return {};
  }
}

function resolveCcfTierByText(text, cfg) {
  const content = normalizeText(text);
  const venues = cfg?.venues || {};

  for (const groupName of ['conference', 'journal']) {
    const group = venues[groupName] || {};
    for (const tier of ['A', 'B', 'C']) {
      const list = group[tier] || [];
      for (const rawName of list) {
        const name = normalizeText(rawName);
        if (!name) continue;
        if (content.includes(name)) {
          return { ccfTier: tier, ccfMatchedBy: `${groupName}:${tier}:${rawName}` };
        }
      }
    }
  }

  return { ccfTier: 'NA', ccfMatchedBy: null };
}

function resolvePaperCcfTier(paper, cfg) {
  const summary = parseSummaryJson(paper?.summaryJson);
  const text = [
    paper?.title,
    paper?.source,
    paper?.tags,
    summary?.venue,
    summary?.journalRef,
    summary?.comment,
    summary?.booktitle,
    summary?.publisher,
    summary?.containerTitle,
  ].join(' ');

  return resolveCcfTierByText(text, cfg);
}

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.length
    ? rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
    : `| ${headers.map(() => '-').join(' | ')} |`;
  return [head, sep, body].join('\n');
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

async function main() {
  const cfg = loadCcfConfig();
  const papers = await prisma.paper.findMany({
    select: {
      id: true,
      title: true,
      source: true,
      tags: true,
      summaryJson: true,
    },
  });

  const catalogStats = {
    conference: { A: 0, B: 0, C: 0, total: 0 },
    journal: { A: 0, B: 0, C: 0, total: 0 },
    total: 0,
  };

  for (const groupName of ['conference', 'journal']) {
    for (const tier of ['A', 'B', 'C']) {
      const count = (cfg?.venues?.[groupName]?.[tier] || []).length;
      catalogStats[groupName][tier] = count;
      catalogStats[groupName].total += count;
      catalogStats.total += count;
    }
  }

  const paperStats = { A: 0, B: 0, C: 0, NA: 0 };
  const unmatched = [];
  for (const paper of papers) {
    const result = resolvePaperCcfTier(paper, cfg);
    paperStats[result.ccfTier] += 1;
    if (result.ccfTier === 'NA' && unmatched.length < 20) {
      unmatched.push([paper.id, (paper.title || '').replace(/\|/g, '\\|') || '-']);
    }
  }

  const covered = paperStats.A + paperStats.B + paperStats.C;
  const coverage = ratio(covered, papers.length);

  const lines = [];
  lines.push('# CCF Coverage Report');
  lines.push('');
  lines.push(`- GeneratedAt: ${new Date().toISOString()}`);
  lines.push(`- Catalog Version: ${cfg.version || 'unknown'}`);
  lines.push(`- Total Papers: ${papers.length}`);
  lines.push(`- Covered Papers (A/B/C): ${covered}`);
  lines.push(`- Coverage: ${coverage}`);
  lines.push('');

  lines.push('## Catalog Summary');
  lines.push('');
  lines.push(
    mdTable(
      ['group', 'A', 'B', 'C', 'total'],
      [
        ['conference', catalogStats.conference.A, catalogStats.conference.B, catalogStats.conference.C, catalogStats.conference.total],
        ['journal', catalogStats.journal.A, catalogStats.journal.B, catalogStats.journal.C, catalogStats.journal.total],
        ['all', catalogStats.conference.A + catalogStats.journal.A, catalogStats.conference.B + catalogStats.journal.B, catalogStats.conference.C + catalogStats.journal.C, catalogStats.total],
      ]
    )
  );
  lines.push('');

  lines.push('## Paper Coverage Summary');
  lines.push('');
  lines.push(
    mdTable(
      ['tier', 'count', 'ratio'],
      [
        ['A', paperStats.A, ratio(paperStats.A, papers.length)],
        ['B', paperStats.B, ratio(paperStats.B, papers.length)],
        ['C', paperStats.C, ratio(paperStats.C, papers.length)],
        ['NA', paperStats.NA, ratio(paperStats.NA, papers.length)],
      ]
    )
  );
  lines.push('');

  lines.push('## Sample Unmatched Papers (Top 20)');
  lines.push('');
  lines.push(mdTable(['paperId', 'title'], unmatched));
  lines.push('');

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log(`CCF coverage report written: ${REPORT_PATH}`);
}

main()
  .catch((error) => {
    console.error(`CCF coverage check crashed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
