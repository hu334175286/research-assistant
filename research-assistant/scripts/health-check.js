#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const PORTS = (process.env.HEALTH_PORTS || '3000,3124,3125')
  .split(',')
  .map((x) => Number(String(x).trim()))
  .filter((x) => Number.isInteger(x) && x > 0);
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 1800);
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'health-check-latest.json');

const ENDPOINTS = [
  { name: 'home', path: '/' },
  { name: 'quick', path: '/quick' },
  { name: 'toolsApi', path: '/api/tools' },
  { name: 'papersApi', path: '/api/papers' },
  { name: 'verifyApi', path: '/api/verify/latest' },
];

function withTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: 'GET',
    cache: 'no-store',
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

async function probe(url) {
  const startedAt = Date.now();
  try {
    const res = await withTimeout(url, TIMEOUT_MS);
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      ms: Date.now() - startedAt,
      error: error?.name || 'Error',
    };
  }
}

async function checkPort(port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const endpointResults = [];

  for (const item of ENDPOINTS) {
    const result = await probe(`${baseUrl}${item.path}`);
    endpointResults.push({
      name: item.name,
      path: item.path,
      ...result,
    });
  }

  const successCount = endpointResults.filter((x) => x.ok).length;

  return {
    port,
    baseUrl,
    successCount,
    endpointCount: ENDPOINTS.length,
    ok: successCount > 0,
    endpoints: endpointResults,
  };
}

function summarize(checks) {
  const active = checks
    .filter((x) => x.ok)
    .sort((a, b) => b.successCount - a.successCount)[0] || null;

  return {
    ts: new Date().toISOString(),
    ports: checks,
    activePort: active?.port || null,
    activeBaseUrl: active?.baseUrl || null,
  };
}

function printResult(result) {
  console.log(`Health check @ ${result.ts}`);
  console.log(`Active: ${result.activeBaseUrl || 'none'}`);

  for (const port of result.ports) {
    const mark = port.ok ? '✅' : '❌';
    console.log(`\n${mark} ${port.baseUrl} (${port.successCount}/${port.endpointCount})`);
    for (const ep of port.endpoints) {
      console.log(`  - ${ep.path} => ${ep.status ?? 'timeout'} (${ep.ms}ms)`);
    }
  }
}

(async () => {
  const checks = [];
  for (const port of PORTS) {
    checks.push(await checkPort(port));
  }

  const result = summarize(checks);
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  printResult(result);

  const hasAnyHealthy = result.ports.some((x) => x.ok);
  if (!hasAnyHealthy) {
    process.exitCode = 1;
  }
})();
