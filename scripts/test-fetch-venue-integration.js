/**
 * 抓取流程中的Venue识别集成测试
 */

const assert = require('assert');
const PaperFetcher = require('../src/fetchers/papers');

async function main() {
  const fetcher = new PaperFetcher();

  const mockPapers = [
    {
      id: '1',
      title: 'Edge Intelligence for Industrial IoT',
      summary: 'industrial iot edge computing and federated learning',
      authors: ['A'],
      journalRef: 'IEEE Internet of Things Journal, vol. 11, 2025',
      comments: 'Accepted by IEEE IoT-J 2025',
      primaryCategory: 'cs.NI',
      source: 'arXiv'
    },
    {
      id: '2',
      title: 'A New Distributed Optimization Method',
      summary: 'distributed systems optimization',
      authors: ['B'],
      journalRef: '',
      comments: '',
      primaryCategory: 'cs.DC',
      source: 'arXiv'
    }
  ];

  const all = fetcher.evaluateAndFilter(mockPapers, { minTier: 0 });
  const topOnly = fetcher.evaluateAndFilter(mockPapers, { minTier: 1, includeArXivOnly: false });

  console.log('集成测试结果:');
  console.log(`- 总评估: ${all.length}`);
  console.log(`- 顶级筛选后: ${topOnly.length}`);

  const first = all[0];
  const firstPaper = first.paper || first;
  console.log(`- 第一篇识别源: ${firstPaper.venueRecognition?.source}`);
  console.log(`- 第一篇识别tier: ${firstPaper.recognizedVenueTier}`);
  console.log(`- 第一篇最终venue: ${firstPaper.venue}`);

  assert.strictEqual(topOnly.length, 1, `期望顶级筛选后为1篇，实际为 ${topOnly.length}`);
  assert.strictEqual(firstPaper.recognizedVenueTier, 1, `期望第一篇识别tier=1，实际为 ${firstPaper.recognizedVenueTier}`);
  assert.ok(/internet of things journal/i.test(firstPaper.venue || ''), `期望第一篇venue被识别为IoT-J对应全称，实际为 ${firstPaper.venue}`);

  // 噪声文本中的短语抽取：应保留缩写/精确匹配类型，不被降级为 phrase
  const noisyTopPapers = [
    {
      id: 'noise-1',
      title: 'Routing in Large-Scale Sensor Networks',
      summary: 'wireless sensor network routing and optimization',
      authors: ['D'],
      journalRef: '',
      comments: 'To appear in Proceedings of ACM MobiCom 2026, camera-ready version',
      primaryCategory: 'cs.NI',
      source: 'arXiv'
    }
  ];

  const noisyEvaluated = fetcher.evaluateAndFilter(noisyTopPapers, {
    minTier: 1,
    includeArXivOnly: false,
    minVenueConfidence: 0.9
  });

  assert.strictEqual(noisyEvaluated.length, 1, '噪声文本中的顶会命中不应被过度惩罚');
  const noisyPaper = noisyEvaluated[0].paper || noisyEvaluated[0];
  assert.strictEqual(noisyPaper.venueRecognition?.matched, true, '噪声文本中的MobiCom应命中');
  assert.ok(
    ['exact', 'abbreviation'].includes(noisyPaper.venueRecognition?.matchType),
    `期望噪声文本保留 exact/abbreviation 匹配类型，实际为 ${noisyPaper.venueRecognition?.matchType}`
  );
  assert.ok(
    ['direct', 'phrase'].includes(noisyPaper.venueRecognition?.extractionMode),
    `噪声文本 extractionMode 异常: ${noisyPaper.venueRecognition?.extractionMode}`
  );
  assert.strictEqual(
    noisyPaper.venueEvidence?.extractionMode,
    noisyPaper.venueRecognition?.extractionMode,
    'venue证据与识别结果的 extractionMode 应一致'
  );

  // 低置信度命中拒绝分支（minVenueConfidence）
  const titleSignalPapers = [
    {
      id: 'title-1',
      title: '[INFOCOM 2026] Distributed Scheduling for Edge-Cloud IoT',
      summary: 'resource scheduling for iot',
      authors: ['E'],
      journalRef: '',
      comments: '',
      primaryCategory: 'cs.NI',
      source: 'arXiv'
    }
  ];

  const titleSignal = fetcher.evaluateAndFilter(titleSignalPapers, {
    minTier: 0,
    includeArXivOnly: false,
    minVenueConfidence: 0.75
  });

  assert.strictEqual(titleSignal.length, 1, 'title 信号样本应被评估保留');
  const titlePaper = titleSignal[0].paper || titleSignal[0];
  assert.strictEqual(titlePaper.venueRecognition?.matched, true, 'title 中的 INFOCOM 应能命中');
  assert.strictEqual(titlePaper.venueRecognition?.source, 'title', 'title 信号应记录为 title 来源');
  assert.ok((titlePaper.venueRecognition?.confidence || 0) <= 0.78, 'title 来源置信度应被封顶');

  const titleSignalStrict = fetcher.evaluateAndFilter(titleSignalPapers, {
    minTier: 0,
    includeArXivOnly: false,
    minVenueConfidence: 0.8
  });
  const titlePaperStrict = titleSignalStrict[0].paper || titleSignalStrict[0];
  assert.strictEqual(titlePaperStrict.venueRecognition?.matched, false, '高阈值下 title 来源应被拒绝，避免误报');
  assert.ok(
    (titlePaperStrict.venueRecognition?.reasonCodes || []).includes('LOW_CONFIDENCE_REJECTED'),
    'title 严格阈值拒绝应包含 LOW_CONFIDENCE_REJECTED'
  );

  const lowConfidencePapers = [
    {
      id: '3',
      title: 'Edge AI Demo Track',
      summary: 'A demo paper for edge AI in IoT systems.',
      authors: ['C'],
      journalRef: '',
      comments: 'Accepted to INFOCOM Workshop on Edge Intelligence 2026',
      primaryCategory: 'cs.NI',
      source: 'arXiv'
    }
  ];

  const lowConfidence = fetcher.evaluateAndFilter(lowConfidencePapers, {
    minTier: 0,
    topN: 5,
    minVenueConfidence: 0.9
  });

  assert.strictEqual(lowConfidence.length, 1, '低置信样本应保留用于后续流程');
  const lowPaper = lowConfidence[0].paper || lowConfidence[0];
  assert.strictEqual(lowPaper.venueRecognition?.matched, false, '低置信命中应被拒绝');
  assert.ok(
    (lowPaper.venueRecognition?.reasonCodes || []).includes('LOW_CONFIDENCE_REJECTED')
      || (lowPaper.venueRecognition?.reasonCodes || []).some(code => String(code).startsWith('NEGATIVE_CONTEXT')),
    '低置信拒绝原因码缺失'
  );

  console.log('✅ 抓取流程Venue识别集成测试通过');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 集成测试失败:', error.message);
    process.exit(1);
  });
}
