const { spawn, execSync } = require('node:child_process');
const http = require('node:http');

const PORTS = [3000, 3124, 3125];
const PATH = '/quick';

function check(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 500;
      res.resume();
      resolve(ok);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startDevOn(port) {
  const child = spawn('cmd', ['/c', `npx next dev --port ${port}`], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', () => {});
  child.unref();
}

async function waitReady(url, retries = 10) {
  for (let i = 0; i < retries; i++) {
    if (await check(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function openBrowser(url) {
  try {
    execSync(`cmd /c start "" "${url}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  for (const p of PORTS) {
    const url = `http://127.0.0.1:${p}${PATH}`;
    if (await check(url)) {
      openBrowser(url);
      console.log(`OPENED=${url}`);
      return;
    }
  }

  for (const p of PORTS) {
    const url = `http://127.0.0.1:${p}${PATH}`;
    startDevOn(p);
    const ok = await waitReady(url, 14);
    if (ok) {
      openBrowser(url);
      console.log(`OPENED=${url}`);
      return;
    }
  }

  const fallback = `http://127.0.0.1:${PORTS[1]}${PATH}`;
  openBrowser(fallback);
  console.log(`OPENED=${fallback}`);
})();
