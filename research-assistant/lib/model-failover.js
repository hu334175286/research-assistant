import { getModelRoute } from '@/lib/model-router';

const RETRYABLE_PATTERNS = [
  { code: 'rate_limit', re: /(rate.?limit|too many requests|429)/i },
  { code: 'insufficient_quota', re: /(insufficient.?quota|quota)/i },
  { code: 'timeout', re: /(timeout|timed out|ETIMEDOUT)/i },
  { code: 'network_error', re: /(ECONNRESET|fetch failed|network|socket)/i },
  { code: 'server_error', re: /(5\d\d|server error|bad gateway|gateway timeout)/i },
];

export function classifyModelError(errorText = '') {
  const text = String(errorText || '');
  for (const p of RETRYABLE_PATTERNS) {
    if (p.re.test(text)) return p.code;
  }
  return 'non_retryable';
}

export function resolveFailoverModel(taskType, failedModels = []) {
  const route = getModelRoute(taskType);
  const chain = [route.primary, ...(route.fallbacks || [])];
  const failed = new Set((failedModels || []).filter(Boolean));
  const next = chain.find((m) => !failed.has(m)) || null;
  return {
    taskType,
    chain,
    failedModels: [...failed],
    nextModel: next,
    canContinue: Boolean(next),
  };
}
