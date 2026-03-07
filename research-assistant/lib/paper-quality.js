export function parseSummaryJson(summaryJson) {
  if (!summaryJson) return {};
  try {
    return JSON.parse(summaryJson);
  } catch {
    return {};
  }
}

export function getPaperQuality(paper) {
  const summary = parseSummaryJson(paper?.summaryJson);
  const relevanceScore = Number(summary?.relevanceScore ?? summary?.relevance ?? 0) || 0;
  const venueTier = String(paper?.venueTier || summary?.venueTier || 'unknown').toUpperCase();

  if (venueTier === 'A' || relevanceScore >= 6) return 'high';
  if (venueTier === 'B' || relevanceScore >= 3) return 'medium';
  return 'low';
}

export function qualityLabel(level) {
  if (level === 'high') return '高质量';
  if (level === 'medium') return '中质量';
  if (level === 'low') return '低质量';
  return '全部';
}
