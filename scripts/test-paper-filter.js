const assert = require('assert');
const PaperFilter = require('../src/utils/paperFilter');

function run() {
  const filter = new PaperFilter();

  const sample = [
    {
      paper: {
        id: 'a1',
        title: 'Top Conf Paper',
        source: 'arXiv',
        published: '2026-03-10T00:00:00Z'
      },
      venueInfo: { tier: 1, abbreviation: 'INFOCOM', tierScore: 100 },
      relevance: { relevant: true, matchedKeywords: ['iot security'] },
      priority: 'HIGH',
      qualityScore: 95
    },
    {
      title: 'Legacy Tier2 Paper',
      source: 'arXiv',
      published: '2026-03-01T00:00:00Z',
      venueAnalysis: { tierScore: 80, matched: { abbr: 'ICC' } },
      qualityScore: 78,
      priority: 'MEDIUM',
      relevance: { relevant: true, matchedKeywords: ['wireless'] }
    },
    {
      title: 'Low Quality Draft',
      source: 'arXiv',
      published: '2026-02-01T00:00:00Z',
      qualityScore: 35,
      priority: 'LOW',
      relevance: { relevant: false, matchedKeywords: [] }
    }
  ];

  const normalized = sample.map(p => filter.normalizePaper(p));
  assert.strictEqual(normalized[0].tier, 1, '新格式 tier 识别失败');
  assert.strictEqual(normalized[1].tier, 2, '旧格式 tierScore->tier 识别失败');

  const highOnly = filter.filter(sample, { priorities: ['HIGH'], minTier: 0, maxTier: 2 });
  assert.strictEqual(highOnly.length, 1, '高优先级筛选失败');

  const scoreFiltered = filter.filter(sample, {
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'NONE'],
    minQualityScore: 70
  });
  assert.strictEqual(scoreFiltered.length, 2, '质量分阈值筛选失败');

  const topOnly = filter.filter(sample, {
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'NONE'],
    tierIn: [1]
  });
  assert.strictEqual(topOnly.length, 1, '顶级期刊/会议筛选失败');

  const keywordFiltered = filter.filter(sample, {
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'NONE'],
    keywords: ['security']
  });
  assert.strictEqual(keywordFiltered.length, 1, '关键词筛选失败');

  const grouped = filter.groupBy(normalized, 'qualityBucket');
  assert.ok(grouped['S(90-100)'], '质量桶分层失败(S)');
  assert.ok(grouped['A(75-89)'], '质量桶分层失败(A)');

  const mockReport = {
    generatedAt: new Date().toISOString(),
    totalPapers: 3,
    filteredPapers: 2,
    criteria: {},
    summary: {
      byTier: filter.groupBy(normalized.slice(0, 2), 'tier'),
      byPriority: filter.groupBy(normalized.slice(0, 2), 'priority'),
      byVenue: filter.groupBy(normalized.slice(0, 2), 'venue'),
      bySource: filter.groupBy(normalized.slice(0, 2), 'source'),
      byQualityBucket: filter.groupBy(normalized.slice(0, 2), 'qualityBucket')
    },
    topPapers: normalized.slice(0, 2)
  };

  const formatted = filter.formatReport(mockReport);
  assert.ok(formatted.includes('论文质量分层与可视化筛选报告'), '报告标题缺失');
  assert.ok(formatted.includes('█'), '可视化条形图未生成');

  console.log('✅ paperFilter 测试通过');
}

run();
