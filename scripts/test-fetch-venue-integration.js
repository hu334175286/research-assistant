/**
 * 抓取流程中的Venue识别集成测试
 */

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

  if (topOnly.length !== 1) {
    throw new Error(`期望顶级筛选后为1篇，实际为 ${topOnly.length}`);
  }

  if (firstPaper.recognizedVenueTier !== 1) {
    throw new Error(`期望第一篇识别tier=1，实际为 ${firstPaper.recognizedVenueTier}`);
  }

  if (!firstPaper.venue || !/internet of things journal/i.test(firstPaper.venue)) {
    throw new Error(`期望第一篇venue被识别为IoT-J对应全称，实际为 ${firstPaper.venue}`);
  }

  console.log('✅ 抓取流程Venue识别集成测试通过');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 集成测试失败:', error.message);
    process.exit(1);
  });
}
