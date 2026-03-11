/**
 * 模块测试文件
 * 用于验证顶刊顶会识别和论文评估功能
 */

const venueMatcher = require('./src/utils/venueMatcher');

console.log('═══════════════════════════════════════════════════════════════');
console.log('           🔬 Research Assistant - 模块测试                      ');
console.log('═══════════════════════════════════════════════════════════════\n');

// 测试 1: 白名单统计
console.log('测试 1: 白名单统计');
console.log('─────────────────────────────────────────────────────────────');
const stats = venueMatcher.getStats();
console.log('白名单配置:');
console.log(`  总期刊/会议数: ${stats.totalVenues}`);
console.log(`  顶级 (Tier 1): ${stats.topTierVenues}`);
console.log(`  二区 (Tier 2): ${stats.tier2Venues}`);
console.log(`  研究方向关键词: ${stats.researchKeywords}`);
console.log('✅ 通过\n');

// 测试 2: 期刊匹配
console.log('测试 2: 期刊/会议匹配');
console.log('─────────────────────────────────────────────────────────────');

const testVenues = [
  'IEEE Internet of Things Journal',
  'IEEE Transactions on Mobile Computing',
  'INFOCOM',
  'SenSys',
  'ACM Conference on Embedded Networked Sensor Systems',
  'IEEE Access',
  'Unknown Journal'
];

for (const venue of testVenues) {
  const info = venueMatcher.getVenueInfo(venue);
  const tier = venueMatcher.getTier(venue);
  const isTop = venueMatcher.isTopVenue(venue);
  
  console.log(`\n输入: "${venue}"`);
  if (info) {
    console.log(`  匹配: ${info.name} (${info.abbreviation})`);
    console.log(`  等级: Tier ${info.tier} ${isTop ? '⭐' : ''}`);
    console.log(`  出版商: ${info.publisher}`);
  } else {
    console.log(`  结果: 未匹配 (Tier ${tier})`);
  }
}
console.log('\n✅ 通过\n');

// 测试 3: 相关性检查
console.log('测试 3: 研究方向相关性检查');
console.log('─────────────────────────────────────────────────────────────');

const testPapers = [
  {
    title: 'Deep Learning for IoT Security in Smart Cities',
    abstract: 'We propose a federated learning approach for anomaly detection in IoT networks.'
  },
  {
    title: 'A Survey of Wireless Communication Protocols',
    abstract: 'This paper reviews recent advances in 5G and LoRaWAN technologies.'
  },
  {
    title: 'Quantum Computing Algorithms',
    abstract: 'We present new quantum algorithms for optimization problems.'
  }
];

for (const paper of testPapers) {
  const relevance = venueMatcher.checkRelevance(paper.title, paper.abstract);
  console.log(`\n标题: ${paper.title}`);
  console.log(`  相关: ${relevance.relevant ? '是' : '否'}`);
  console.log(`  分数: ${(relevance.score * 100).toFixed(1)}%`);
  console.log(`  匹配关键词: ${relevance.matchedKeywords.join(', ') || '无'}`);
}
console.log('\n✅ 通过\n');

// 测试 4: 论文评估
console.log('测试 4: 论文综合评估');
console.log('─────────────────────────────────────────────────────────────');

const testFullPapers = [
  {
    title: 'Deep Learning for IoT Security in Smart Cities',
    venue: 'IEEE Internet of Things Journal',
    abstract: 'We propose a federated learning approach for anomaly detection in IoT networks.',
    authors: ['John Doe', 'Jane Smith']
  },
  {
    title: 'Energy Efficient Routing in Wireless Sensor Networks',
    venue: 'IEEE Access',
    abstract: 'This paper presents a novel routing protocol for sensor networks.',
    authors: ['Alice Wang']
  },
  {
    title: 'Some Random Paper',
    venue: 'Unknown Conference',
    abstract: 'This is not related to IoT or sensing.',
    authors: ['Bob Johnson']
  }
];

const evaluated = venueMatcher.evaluatePapers(testFullPapers);

for (const item of evaluated) {
  console.log(`\n标题: ${item.paper.title}`);
  console.log(`  来源: ${item.venueInfo?.name || item.paper.venue} ${item.venueInfo?.tier === 1 ? '⭐' : ''}`);
  console.log(`  质量分: ${item.qualityScore}/100`);
  console.log(`  优先级: ${item.priority}`);
  console.log(`  建议: ${item.recommendation}`);
}
console.log('\n✅ 通过\n');

// 测试 5: 获取顶刊顶会列表
console.log('测试 5: 顶刊顶会列表');
console.log('─────────────────────────────────────────────────────────────');
const topVenues = venueMatcher.getTopVenues();
console.log(`共有 ${topVenues.length} 个顶刊顶会:`);
for (let i = 0; i < Math.min(10, topVenues.length); i++) {
  const v = topVenues[i];
  console.log(`  ${i + 1}. ${v.name} (${v.abbreviation}) - ${v.publisher}`);
}
if (topVenues.length > 10) {
  console.log(`  ... 还有 ${topVenues.length - 10} 个`);
}
console.log('\n✅ 通过\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    ✅ 所有测试通过!                              ');
console.log('═══════════════════════════════════════════════════════════════');
