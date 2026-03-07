#!/usr/bin/env node

const { spawn } = require('node:child_process');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3123';
const STARTUP_TIMEOUT_MS = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS || 90000);
const FETCH_TIMEOUT_MS = Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 15000);

const CHECKS = [
  { path: '/', expectedStatuses: [200] },
  { path: '/dashboard', expectedStatuses: [200] },
  { path: '/papers', expectedStatuses: [200] },
  { path: '/api/papers/auto-fetch', expectedStatuses: [200] },
  { path: '/api/papers/arxiv?q=wireless%20sensing&maxResults=3', expectedStatuses: [200] }
];

let devServer = null;
const BASE_PORT = new URL(BASE_URL).port || '80';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isServerReady() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/`, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run dev -- --port ${BASE_PORT}`]
      : ['run', 'dev', '--', '--port', BASE_PORT];
    devServer = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, PORT: BASE_PORT },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    devServer.stdout.on('data', (buf) => {
      process.stdout.write(`[dev] ${buf}`);
    });

    devServer.stderr.on('data', (buf) => {
      process.stderr.write(`[dev:err] ${buf}`);
    });

    devServer.on('error', (error) => {
      reject(new Error(`启动 Next.js 开发服务器失败：${error.message}`));
    });

    devServer.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        console.error(`开发服务器提前退出，code=${code}, signal=${signal || 'none'}`);
      }
    });

    resolve();
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isServerReady()) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

async function runChecks() {
  const results = [];

  for (const check of CHECKS) {
    const url = `${BASE_URL}${check.path}`;
    try {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      const bodyText = await res.text();
      const ok = check.expectedStatuses.includes(res.status);
      results.push({
        url,
        ok,
        status: res.status,
        details: ok ? 'ok' : `期望状态码 ${check.expectedStatuses.join('/')}，实际 ${res.status}，响应片段：${bodyText.slice(0, 240)}`
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        status: null,
        details: `请求失败：${error.name || 'Error'} - ${error.message}`
      });
    }
  }

  return results;
}

function printSummary(results) {
  console.log('\n===== Smoke Check Result =====');
  for (const item of results) {
    const mark = item.ok ? '✅' : '❌';
    console.log(`${mark} ${item.url}`);
    if (!item.ok) {
      console.log(`   ${item.details}`);
    }
  }

  const passed = results.filter((x) => x.ok).length;
  const failed = results.length - passed;
  console.log(`\n总计 ${results.length} 项，通过 ${passed}，失败 ${failed}`);
}

async function stopDevServer() {
  if (!devServer || devServer.killed) return;

  await new Promise((resolve) => {
    devServer.once('exit', () => resolve());
    devServer.kill('SIGTERM');
    setTimeout(() => {
      if (!devServer.killed) {
        devServer.kill('SIGKILL');
      }
      resolve();
    }, 5000);
  });
}

(async function main() {
  const alreadyUp = await isServerReady();

  if (!alreadyUp) {
    console.log(`未检测到可用服务，尝试启动开发服务器：${BASE_URL}`);
    await startDevServer();
    const ready = await waitForServer();
    if (!ready) {
      await stopDevServer();
      throw new Error(`服务在 ${STARTUP_TIMEOUT_MS}ms 内未就绪：${BASE_URL}`);
    }
  } else {
    console.log(`检测到已有服务，直接执行冒烟检查：${BASE_URL}`);
  }

  const results = await runChecks();
  printSummary(results);

  await stopDevServer();

  const failed = results.some((x) => !x.ok);
  if (failed) {
    process.exitCode = 1;
  }
})().catch(async (error) => {
  console.error(`\n❌ 冒烟检查失败：${error.message}`);
  await stopDevServer();
  process.exit(1);
});
