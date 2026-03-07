const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'automation');
const OUT_FILE = path.join(OUT_DIR, 'latest.md');

const STEPS = [
  { name: 'Build', cmd: 'npm run build' },
  { name: 'Smoke', cmd: 'npm run smoke' },
  { name: 'AutoFetch', cmd: 'npm run papers:auto-fetch' },
];

function runStep(step) {
  const started = new Date();
  try {
    const output = execSync(step.cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    return {
      ...step,
      ok: true,
      started,
      ended: new Date(),
      output: output.trim(),
    };
  } catch (e) {
    return {
      ...step,
      ok: false,
      started,
      ended: new Date(),
      output: String(e.stdout || '').trim(),
      error: String(e.stderr || e.message || e).trim(),
    };
  }
}

function toMd(results) {
  const now = new Date();
  const allOk = results.every((r) => r.ok);
  const lines = [];
  lines.push(`# Dev Auto Cycle Report`);
  lines.push('');
  lines.push(`- GeneratedAt: ${now.toISOString()}`);
  lines.push(`- Project: ${ROOT}`);
  lines.push(`- Overall: ${allOk ? 'PASS' : 'FAIL'}`);
  lines.push('');

  for (const r of results) {
    lines.push(`## ${r.name} - ${r.ok ? 'PASS' : 'FAIL'}`);
    lines.push(`- Command: \`${r.cmd}\``);
    lines.push(`- Started: ${r.started.toISOString()}`);
    lines.push(`- Ended: ${r.ended.toISOString()}`);
    lines.push('');
    if (r.output) {
      lines.push('```text');
      lines.push(r.output.slice(-4000));
      lines.push('```');
      lines.push('');
    }
    if (!r.ok && r.error) {
      lines.push('### Error');
      lines.push('```text');
      lines.push(r.error.slice(-4000));
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

(function main() {
  const results = STEPS.map(runStep);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, toMd(results), 'utf8');

  const allOk = results.every((r) => r.ok);
  console.log(`Auto cycle finished: ${allOk ? 'PASS' : 'FAIL'}`);
  console.log(`Report: ${OUT_FILE}`);

  if (!allOk) process.exit(1);
})();
