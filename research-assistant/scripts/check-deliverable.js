#!/usr/bin/env node

const { spawnSync, spawn } = require('node:child_process');

const STARTUP_TIMEOUT_MS = 90000;

function runStep(name, command, args = [], envExtra = {}) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...envExtra },
  });
  if (result.status !== 0) {
    throw new Error(`${name} failed with exit code ${result.status}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

async function checkPapersApi(baseUrl) {
  console.log('\n=== papers API filter + pagination checks ===');

  const oldShapeRes = await fetch(`${baseUrl}/api/papers`);
  if (!oldShapeRes.ok) throw new Error(`GET /api/papers failed: ${oldShapeRes.status}`);
  const oldShape = await oldShapeRes.json();
  if (!Array.isArray(oldShape)) throw new Error('Backward compatibility check failed: /api/papers should return array by default');

  const pageRes = await fetch(`${baseUrl}/api/papers?quality=all&page=1&pageSize=5`);
  if (!pageRes.ok) throw new Error(`GET /api/papers?page=... failed: ${pageRes.status}`);
  const pageData = await pageRes.json();
  if (!pageData || !Array.isArray(pageData.items) || !pageData.meta) {
    throw new Error('Pagination response shape invalid: expected { items, meta }');
  }

  const requiredMeta = ['total', 'hasMore', 'page', 'pageSize'];
  for (const key of requiredMeta) {
    if (!(key in pageData.meta)) {
      throw new Error(`Pagination meta missing field: ${key}`);
    }
  }

  if (pageData.meta.page !== 1 || pageData.meta.pageSize !== 5) {
    throw new Error(`Pagination echo mismatch: page=${pageData.meta.page}, pageSize=${pageData.meta.pageSize}`);
  }

  const filterRes = await fetch(`${baseUrl}/api/papers?quality=high&ccfTier=A&page=1&pageSize=5`);
  if (!filterRes.ok) throw new Error(`GET /api/papers with filters failed: ${filterRes.status}`);
  const filterData = await filterRes.json();
  if (!filterData.meta || typeof filterData.meta.total !== 'number') {
    throw new Error('Filter + pagination check failed: meta.total missing or invalid');
  }

  console.log('✅ papers API checks passed');
}

async function withStartedServer(port, fn) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run start -- --port ${port}`]
    : ['run', 'start', '--', '--port', String(port)];

  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  });

  try {
    const ready = await waitUntilReady(baseUrl, STARTUP_TIMEOUT_MS);
    if (!ready) throw new Error(`Server not ready within ${STARTUP_TIMEOUT_MS}ms`);
    await fn(baseUrl);
  } finally {
    if (!child.killed) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    }
  }
}

(async function main() {
  runStep('build', 'npm', ['run', 'build']);
  runStep('smoke', 'npm', ['run', 'smoke']);
  runStep('auto-fetch', 'npm', ['run', 'papers:auto-fetch']);

  await withStartedServer(3136, async (baseUrl) => {
    await checkPapersApi(baseUrl);
  });

  console.log('\n✅ Deliverable acceptance checks passed');
})().catch((err) => {
  console.error(`\n❌ check:deliverable failed: ${err.message}`);
  process.exit(1);
});
