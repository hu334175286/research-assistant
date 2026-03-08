const DEFAULT_PORTS = [3000, 3124];

export async function getRuntimePortHealth() {
  const checks = [];

  for (const port of DEFAULT_PORTS) {
    const baseUrl = `http://127.0.0.1:${port}`;
    const [root, api] = await Promise.all([
      probe(`${baseUrl}/`),
      probe(`${baseUrl}/api/tools`),
    ]);

    const ok = root.ok || api.ok;
    checks.push({
      port,
      baseUrl,
      ok,
      rootStatus: root.status,
      apiStatus: api.status,
      rootMs: root.ms,
      apiMs: api.ms,
      note: ok ? '服务可访问' : '未检测到可用响应',
    });
  }

  const active = checks.find((item) => item.ok) || null;

  return {
    checks,
    activePort: active?.port || null,
    activeBaseUrl: active?.baseUrl || null,
  };
}

async function probe(url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - startedAt };
  } catch {
    return { ok: false, status: null, ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}
