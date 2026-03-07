export async function getRecommendedBaseUrl() {
  const primary = 'http://127.0.0.1:3000';
  const fallback = 'http://127.0.0.1:3124';

  const isPrimaryAvailable = await canReach(primary);
  return {
    recommended: isPrimaryAvailable ? primary : fallback,
    primary,
    fallback,
    isPrimaryAvailable,
  };
}

async function canReach(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 700);

  try {
    const res = await fetch(baseUrl, {
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
