const CANDIDATES = [
  { label: 'primary', url: 'http://127.0.0.1:3000', port: 3000 },
  { label: 'fallback', url: 'http://127.0.0.1:3124', port: 3124 },
];

export async function getRecommendedBaseUrl() {
  const checks = await Promise.all(
    CANDIDATES.map(async (item) => ({
      ...item,
      available: await canReach(item.url),
    }))
  );

  const firstAvailable = checks.find((item) => item.available);
  const recommended = firstAvailable?.url || CANDIDATES[0].url;

  return {
    recommended,
    primary: CANDIDATES[0].url,
    fallback: CANDIDATES[1].url,
    isPrimaryAvailable: checks[0].available,
    checks,
  };
}

async function canReach(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 900);

  try {
    const res = await fetch(`${baseUrl}/quick`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
