#!/usr/bin/env node

const { spawn } = require('node:child_process');
const net = require('node:net');

const DEFAULT_PORT_CANDIDATES = [3000, 3124, 3125];
const STARTUP_TIMEOUT_MS = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS || 90000);
const FETCH_TIMEOUT_MS = Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 15000);

const CHECKS = [
  { path: '/', expectedStatuses: [200] },
  { path: '/dashboard', expectedStatuses: [200] },
  { path: '/papers', expectedStatuses: [200] },
  { path: '/api/papers/auto-fetch', expectedStatuses: [200] },
  { path: '/api/papers', expectedStatuses: [200] },
  // 依赖外部 arXiv 网络，允许上游抖动时返回 500/502，避免误判本地服务不可用。
  { path: '/api/papers/arxiv?q=wireless%20sensing&maxResults=3', expectedStatuses: [200, 500, 502] }
];

let devServer = null;
let devServerExited = false;
let manualStopRequested = false;
let selectedPort = null;
let baseUrl = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(input) {
  const normalized = input.startsWith('http://') || input.startsWith('https://') ? input : `http://${input}`;
  const url = new URL(normalized);
  return {
    url,
    baseUrl: `${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    host: url.hostname
  };
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

async function isServerReady(targetBaseUrl) {
  try {
    const res = await fetchWithTimeout(`${targetBaseUrl}/`, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

function isPortFree(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFreePort(start = 3200, end = 3299) {
  for (let port = start; port <= end; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  return null;
}

async function resolveTarget() {
  const mode = process.env.SMOKE_SERVER_MODE || 'start';
  const forceSpawn = process.env.SMOKE_FORCE_SPAWN === '1' || mode === 'start';

  if (process.env.SMOKE_BASE_URL) {
    const explicit = normalizeBaseUrl(process.env.SMOKE_BASE_URL);
    const ready = await isServerReady(explicit.baseUrl);
    return {
      ...explicit,
      usingExistingServer: ready && !forceSpawn,
      shouldStartServer: forceSpawn || !ready,
      strategy: 'explicit'
    };
  }

  const existingReady = [];
  for (const port of DEFAULT_PORT_CANDIDATES) {
    const candidateBaseUrl = `http://127.0.0.1:${port}`;
    if (await isServerReady(candidateBaseUrl)) {
      existingReady.push({ port, baseUrl: candidateBaseUrl });
      if (!forceSpawn) {
        return {
          baseUrl: candidateBaseUrl,
          port,
          usingExistingServer: true,
          shouldStartServer: false,
          strategy: 'existing'
        };
      }
    }

    if (await isPortFree(port)) {
      return {
        baseUrl: candidateBaseUrl,
        port,
        usingExistingServer: false,
        shouldStartServer: true,
        strategy: forceSpawn ? 'isolated' : 'fallback'
      };
    }
  }

  if (existingReady.length) {
    const picked = existingReady[0];
    return {
      ...picked,
      usingExistingServer: true,
      shouldStartServer: false,
      strategy: 'existing-all-busy'
    };
  }

  const extraPort = await findFreePort();
  if (extraPort) {
    return {
      baseUrl: `http://127.0.0.1:${extraPort}`,
      port: extraPort,
      usingExistingServer: false,
      shouldStartServer: true,
      strategy: 'dynamic-free-port'
    };
  }

  throw new Error(`端口均不可用（候选：${DEFAULT_PORT_CANDIDATES.join(', ')}，扩展区间 3200-3299）`);
}

function startDevServer(port) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const mode = process.env.SMOKE_SERVER_MODE || 'start';
    const npmScript = mode === 'dev' ? 'dev' : 'start';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run ${npmScript} -- --port ${port}`]
      : ['run', npmScript, '--', '--port', String(port)];

    devServerExited = false;
    manualStopRequested = false;
    devServer = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
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
      devServerExited = true;
      if (!manualStopRequested && code !== 0 && signal !== 'SIGTERM') {
        console.error(`开发服务器提前退出，code=${code}, signal=${signal || 'none'}`);
      }
    });

    resolve();
  });
}

async function waitForServer(targetBaseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isServerReady(targetBaseUrl)) {
      return true;
    }
    if (devServerExited) {
      return false;
    }
    await sleep(1000);
  }
  return false;
}

async function runChecks() {
  const results = [];

  for (const check of CHECKS) {
    const url = `${baseUrl}${check.path}`;
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
  console.log(`最终使用端口：${selectedPort}`);
  console.log(`基准地址：${baseUrl}`);

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

  manualStopRequested = true;

  await new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    devServer.once('exit', done);

    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(devServer.pid), '/T', '/F'], {
        stdio: 'ignore'
      });
      killer.once('exit', done);
    } else {
      devServer.kill('SIGTERM');
      setTimeout(() => {
        if (!devServer.killed) {
          devServer.kill('SIGKILL');
        }
        done();
      }, 5000);
    }
  });
}

(async function main() {
  const target = await resolveTarget();
  selectedPort = target.port;
  baseUrl = target.baseUrl;

  if (target.usingExistingServer) {
    console.log(`检测到已有服务，直接执行冒烟检查：${baseUrl}`);
  } else {
    console.log(`未检测到可用服务，启动开发服务器：${baseUrl}`);
    await startDevServer(selectedPort);
    const ready = await waitForServer(baseUrl);
    if (!ready) {
      await stopDevServer();
      throw new Error(`服务在 ${STARTUP_TIMEOUT_MS}ms 内未就绪：${baseUrl}`);
    }
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
  if (selectedPort) {
    console.error(`端口信息：${selectedPort}`);
  }
  await stopDevServer();
  process.exit(1);
});
