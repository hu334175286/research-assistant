/**
 * 顶刊顶会识别模块测试脚本
 * 用于验证 venue-whitelist.json 和 venueMatcher.js 的功能
 */

const venueMatcher = require('../src/utils/venueMatcher');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     🔬 顶刊顶会识别模块 - 功能测试                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

// 1. 测试白名单统计
console.log('📊 白名单统计');
console.log('─────────────────────────────────────────────────────────────');
const stats = venueMatcher.getStats();
if (stats) {
  console.log(`总期刊/会议数: ${stats.totalVenues}`);
  console.log(`  - 顶级 (Tier 1): ${stats.topTierVenues} 个`);
  console.log(`  - 二区 (Tier 2): ${stats.tier2Venues} 个`);
  console.log(`研究方向关键词: ${stats.researchKeywords} 个`);
} else {
  console.log('❌ 无法获取统计信息');
}
console.log();

// 2. 测试venue匹配
console.log('🎯 Venue 匹配测试');
console.log('─────────────────────────────────────────────────────────────');

const testCases = [
  { input: 'IEEE INFOCOM', expected: 'INFOCOM' },
  { input: 'ACM MobiCom 2024', expected: 'MobiCom' },
  { input: 'IEEE Internet of Things Journal', expected: 'IoT-J' },
  { input: 'ACM SenSys', expected: 'SenSys' },
  { input: 'IEEE Transactions on Mobile Computing', expected: 'TMC' },
  { input: 'Proc. IEEE INFOCOM 2005', expected: 'INFOCOM' },
  { input: 'Proceedings of ACM CCS 2023', expected: 'CCS' },
  { input: 'IEEE ICC', expected: 'ICC' },
  { input: 'Unknown Conference', expected: null }
];

for (const test of testCases) {
  const detailed = venueMatcher.matchDetailed(test.input);
  const result = detailed ? detailed.venue : null;
  const status = result ? '✅' : (test.expected ? '❌' : '✅');
  const matched = result ? result.abbreviation : '未匹配';
  const tier = result ? `(Tier ${result.tier})` : '';
  const confidence = detailed ? `, conf=${detailed.confidence.toFixed(2)}, by=${detailed.matchedBy}` : '';
  console.log(`${status} "${test.input}" -> ${matched} ${tier}${confidence}`);
}
console.log();

// 3. 测试从文本提取venue
console.log('🔍 文本提取测试');
console.log('─────────────────────────────────────────────────────────────');

const extractCases = [
  'Proc. IEEE INFOCOM 2005, Vol. 1, pp. 1-11. Miami, FL (2005)',
  'To appear in ACM MobiCom 2024',
  'Presented at IEEE SenSys 2023',
  'IEEE Internet of Things Journal, vol. 10, no. 5',
  'Published in ACM TOSN'
];

for (const text of extractCases) {
  const result = venueMatcher.extractAndMatch(text);
  if (result) {
    console.log(`✅ "${text.substring(0, 40)}..."`);
    console.log(`   -> ${result.name} (${result.abbreviation}, Tier ${result.tier})`);
  } else {
    console.log(`❌ "${text.substring(0, 40)}..." -> 未匹配`);
  }
}
console.log();

// 4. 测试多来源分类排序（同分时应优先顶级）
console.log('⚖️ 多来源分类排序测试');
console.log('─────────────────────────────────────────────────────────────');

const rankingCase = venueMatcher.classifyVenue([
  { name: 'comments', text: 'IEEE ICC 2025', weight: 1.0 }, // Tier 2
  { name: 'journalRef', text: 'IEEE INFOCOM 2025', weight: 1.0 } // Tier 1
]);

if (rankingCase.matched) {
  console.log(`✅ 最佳命中: ${rankingCase.venueInfo.abbreviation} (Tier ${rankingCase.venueInfo.tier})`);
  console.log(`   来源: ${rankingCase.best.source}, 置信度: ${rankingCase.best.confidence.toFixed(2)}`);
} else {
  console.log('❌ 未匹配到任何Venue');
}
console.log();

// 5. 测试相关性检查
console.log('📝 相关性检查测试');
console.log('─────────────────────────────────────────────────────────────');

const relevanceCases = [
  { title: 'Deep Learning for IoT Security', abstract: 'We propose a novel deep learning approach...' },
  { title: 'Wireless Sensor Network Routing', abstract: 'This paper presents a new routing protocol...' },
  { title: 'Quantum Computing Basics', abstract: 'An introduction to quantum computing...' }
];

for (const test of relevanceCases) {
  const result = venueMatcher.checkRelevance(test.title, test.abstract);
  const status = result.relevant ? '✅' : '❌';
  console.log(`${status} "${test.title}"`);
  console.log(`   相关: ${result.relevant}, 分数: ${result.score.toFixed(2)}, 匹配: ${result.matchedKeywords.join(', ') || '无'}`);
}
console.log();

// 5. 测试论文评估
console.log('📄 论文评估测试');
console.log('─────────────────────────────────────────────────────────────');

const samplePaper = {
  title: 'Federated Learning for Edge Computing in Industrial IoT',
  venue: 'IEEE Internet of Things Journal',
  abstract: 'This paper proposes a federated learning framework for edge computing in industrial IoT environments. We address the challenges of data privacy and communication efficiency.',
  authors: ['John Doe', 'Jane Smith']
};

const evaluation = venueMatcher.evaluatePaper(samplePaper);
console.log(`标题: ${evaluation.paper.title}`);
console.log(`Venue: ${evaluation.venueInfo?.name || 'Unknown'} ${evaluation.venueInfo?.isTop ? '⭐' : ''}`);
console.log(`等级: ${evaluation.venueInfo?.tierLabel || 'N/A'} (Tier ${evaluation.venueInfo?.tier || 0})`);
console.log(`质量分: ${evaluation.qualityScore}`);
console.log(`优先级: ${evaluation.priority}`);
console.log(`推荐: ${evaluation.recommendation}`);
console.log(`匹配关键词: ${evaluation.relevance.matchedKeywords.join(', ')}`);
console.log();

// 6. 获取所有顶刊顶会
console.log('🏆 顶级期刊/会议列表');
console.log('─────────────────────────────────────────────────────────────');
const topVenues = venueMatcher.getTopVenues();
console.log(`共 ${topVenues.length} 个顶刊顶会:`);
for (const venue of topVenues.slice(0, 10)) {
  console.log(`  • ${venue.abbreviation} - ${venue.name} (${venue.publisher})`);
}
if (topVenues.length > 10) {
  console.log(`  ... 还有 ${topVenues.length - 10} 个`);
}
console.log();

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    测试完成 ✨                                 ');
console.log('═══════════════════════════════════════════════════════════════');
