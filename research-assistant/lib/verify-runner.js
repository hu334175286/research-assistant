import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const VERIFY_LATEST_PATH = path.join(process.cwd(), 'data', 'verify-latest.json');
const LOG_TAIL_LIMIT = 6000;

function tailText(text, maxChars = LOG_TAIL_LIMIT) {
  if (!text) return '';
  return text.length <= maxChars ? text : text.slice(-maxChars);
}

function runCommand(command, args, envOverrides = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const proc = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...envOverrides },
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code, signal) => {
      const finishedAt = Date.now();
      resolve({
        code,
        signal,
        ok: code === 0,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        stdoutTail: tailText(stdout),
        stderrTail: tailText(stderr),
      });
    });

    proc.on('error', (error) => {
      const finishedAt = Date.now();
      resolve({
        code: -1,
        signal: null,
        ok: false,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        stdoutTail: tailText(stdout),
        stderrTail: tailText(`${stderr}\n${error.message}`),
      });
    });
  });
}

function buildStep(name, command, args, result) {
  return {
    name,
    command: [command, ...args].join(' '),
    ...result,
  };
}

export async function runVerify({ dryRun = false } = {}) {
  const startedAt = Date.now();
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const steps = [];

  if (dryRun) {
    steps.push({
      name: 'build',
      command: `${npmCmd} run build`,
      skipped: true,
      ok: true,
      reason: 'dryRun=true',
    });
    steps.push({
      name: 'smoke',
      command: `${npmCmd} run smoke`,
      skipped: true,
      ok: true,
      reason: 'dryRun=true',
    });
  } else {
    await fs.rm(path.join(process.cwd(), '.next'), { recursive: true, force: true });

    const buildResult = await runCommand(npmCmd, ['run', 'build']);
    steps.push(buildStep('build', npmCmd, ['run', 'build'], buildResult));

    if (buildResult.ok) {
      const smokeResult = await runCommand(npmCmd, ['run', 'smoke'], {
        SMOKE_SERVER_MODE: process.env.SMOKE_SERVER_MODE || 'start',
        SMOKE_FORCE_SPAWN: process.env.SMOKE_FORCE_SPAWN || '1',
      });
      steps.push(buildStep('smoke', npmCmd, ['run', 'smoke'], smokeResult));
    } else {
      steps.push({
        name: 'smoke',
        command: `${npmCmd} run smoke`,
        skipped: true,
        ok: false,
        reason: 'build failed',
      });
    }
  }

  const finishedAt = Date.now();
  const ok = steps.every((step) => step.ok);

  const result = {
    ts: new Date().toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    dryRun,
    ok,
    logPath: VERIFY_LATEST_PATH,
    steps,
  };

  await fs.mkdir(path.dirname(VERIFY_LATEST_PATH), { recursive: true });
  await fs.writeFile(VERIFY_LATEST_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  return result;
}

export async function readLatestVerifyResult() {
  const raw = await fs.readFile(VERIFY_LATEST_PATH, 'utf8');
  return JSON.parse(raw);
}

export { VERIFY_LATEST_PATH };
