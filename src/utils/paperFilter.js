/**
 * 论文质量筛选与可视化工具
 * 提供分层筛选和统计功能
 */

const fs = require('fs').promises;
const path = require('path');
const venueMatcher = require('./venueMatcher');

class PaperFilter {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.papersFile = path.join(this.dataDir, 'papers.json');
  }

  /**
   * 加载论文数据
   */
  async loadPapers() {
    try {
      const data = await fs.readFile(this.papersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[PaperFilter] 加载论文失败:', error.message);
      return [];
    }
  }

  /**
   * 筛选论文
   * @param {Array} papers - 论文列表
   * @param {Object} criteria - 筛选条件
   */
  filter(papers, criteria = {}) {
    const {
      minTier = 0,              // 最低等级
      maxTier = 2,              // 最高等级
      priorities = ['HIGH', 'MEDIUM', 'LOW'],  // 优先级
      requireRelevant = false,  // 是否要求相关
      minQualityScore = 0,      // 最低质量分
      sources = [],             // 来源过滤 (空数组表示全部)
      keywords = [],            // 关键词过滤
      dateRange = null,         // 日期范围 {start, end}
      venues = []               // 特定venue过滤
    } = criteria;

    return papers.filter(p => {
      // 等级筛选 (兼容新旧数据格式)
      const tier = p.venueInfo?.tier || p.venueAnalysis?.tierScore / 100 || 0;
      if (tier < minTier || tier > maxTier) return false;

      // 优先级筛选 (旧数据可能没有priority字段)
      const priority = p.priority || 'NONE';
      if (!priorities.includes(priority)) return false;

      // 相关性要求
      if (requireRelevant && !p.relevance?.relevant) return false;

      // 质量分筛选
      if (p.qualityScore < minQualityScore) return false;

      // 来源筛选
      if (sources.length > 0) {
        const source = p.paper?.source || p.source;
        if (!sources.includes(source)) return false;
      }

      // 关键词筛选
      if (keywords.length > 0) {
        const paperKeywords = p.relevance?.matchedKeywords || [];
        const hasKeyword = keywords.some(kw => 
          paperKeywords.some(pk => pk.toLowerCase().includes(kw.toLowerCase()))
        );
        if (!hasKeyword) return false;
      }

      // Venue筛选 (兼容新旧数据格式)
      if (venues.length > 0) {
        const venue = p.venueInfo?.abbreviation || p.venueInfo?.name || 
                      p.venueAnalysis?.matched?.abbr || p.venueAnalysis?.matched?.name;
        if (!venues.some(v => venue?.toLowerCase().includes(v.toLowerCase()))) {
          return false;
        }
      }

      // 日期筛选
      if (dateRange) {
        const pubDate = new Date(p.paper?.published || p.published);
        if (dateRange.start && pubDate < new Date(dateRange.start)) return false;
        if (dateRange.end && pubDate > new Date(dateRange.end)) return false;
      }

      return true;
    });
  }

  /**
   * 按不同维度分组统计
   */
  groupBy(papers, dimension) {
    const groups = {};
    
    for (const paper of papers) {
      let key;
      switch (dimension) {
        case 'tier':
          key = `Tier ${paper.venueInfo?.tier || paper.venueAnalysis?.tierScore / 100 || 0}`;
          break;
        case 'priority':
          key = paper.priority || 'NONE';
          break;
        case 'venue':
          key = paper.venueInfo?.abbreviation || paper.venueInfo?.name || 
                paper.venueAnalysis?.matched?.abbr || paper.venueAnalysis?.matched?.name || 'Unknown';
          break;
        case 'source':
          key = paper.paper?.source || paper.source || 'Unknown';
          break;
        case 'month':
          const date = new Date(paper.paper?.published || paper.published);
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = { count: 0, papers: [] };
      }
      groups[key].count++;
      if (groups[key].papers.length < 5) {
        groups[key].papers.push({
          title: paper.paper?.title || paper.title,
          priority: paper.priority || 'NONE',
          qualityScore: paper.qualityScore || paper.venueAnalysis?.tierScore || 0
        });
      }
    }

    // 按数量排序
    return Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }

  /**
   * 生成筛选报告
   */
  async generateFilterReport(criteria = {}) {
    const papers = await this.loadPapers();
    const filtered = this.filter(papers, criteria);

    const report = {
      totalPapers: papers.length,
      filteredPapers: filtered.length,
      criteria,
      summary: {
        byTier: this.groupBy(filtered, 'tier'),
        byPriority: this.groupBy(filtered, 'priority'),
        byVenue: this.groupBy(filtered, 'venue'),
        bySource: this.groupBy(filtered, 'source')
      },
      topPapers: filtered
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 10)
        .map(p => ({
          title: p.paper?.title || p.title,
          venue: p.venueInfo?.abbreviation || p.venueInfo?.name,
          tier: p.venueInfo?.tier,
          priority: p.priority,
          qualityScore: p.qualityScore,
          matchedKeywords: p.relevance?.matchedKeywords?.slice(0, 5)
        }))
    };

    return report;
  }

  /**
   * 格式化报告为文本
   */
  formatReport(report) {
    const lines = [];
    
    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║           📊 论文筛选报告                                     ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`筛选条件:`);
    lines.push(`  原始论文数: ${report.totalPapers}`);
    lines.push(`  筛选后: ${report.filteredPapers}`);
    if (report.criteria.minTier > 0) {
      lines.push(`  最低等级: Tier ${report.criteria.minTier}`);
    }
    if (report.criteria.priorities) {
      lines.push(`  优先级: ${report.criteria.priorities.join(', ')}`);
    }
    lines.push('');

    // 等级分布
    lines.push('📊 等级分布');
    lines.push('─────────────────────────────────────────────────────────────');
    for (const [tier, info] of Object.entries(report.summary.byTier)) {
      lines.push(`  ${tier}: ${info.count} 篇`);
    }
    lines.push('');

    // 优先级分布
    lines.push('🎯 优先级分布');
    lines.push('─────────────────────────────────────────────────────────────');
    for (const [priority, info] of Object.entries(report.summary.byPriority)) {
      lines.push(`  ${priority}: ${info.count} 篇`);
    }
    lines.push('');

    // Venue分布
    if (Object.keys(report.summary.byVenue).length > 0) {
      lines.push('🏛️ Venue分布 (Top 10)');
      lines.push('─────────────────────────────────────────────────────────────');
      const venues = Object.entries(report.summary.byVenue).slice(0, 10);
      for (const [venue, info] of venues) {
        lines.push(`  ${venue}: ${info.count} 篇`);
      }
      lines.push('');
    }

    // Top论文
    if (report.topPapers.length > 0) {
      lines.push('🌟 高质量论文 Top 10');
      lines.push('─────────────────────────────────────────────────────────────');
      for (let i = 0; i < report.topPapers.length; i++) {
        const p = report.topPapers[i];
        lines.push(`\n[${i + 1}] ${p.title}`);
        lines.push(`    Venue: ${p.venue || 'Unknown'} ${p.tier === 1 ? '⭐' : ''}`);
        lines.push(`    优先级: ${p.priority} | 质量分: ${p.qualityScore}`);
        if (p.matchedKeywords?.length > 0) {
          lines.push(`    关键词: ${p.matchedKeywords.join(', ')}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// 命令行接口
async function main() {
  const filter = new PaperFilter();

  // 解析命令行参数
  const args = process.argv.slice(2);
  const criteria = {
    minTier: 0,
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'NONE']  // 包含NONE以兼容旧数据
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--top-only':
        criteria.minTier = 1;
        break;
      case '--high-only':
        criteria.priorities = ['HIGH'];
        break;
      case '--min-tier':
        criteria.minTier = parseInt(args[++i]) || 0;
        break;
      case '--relevant':
        criteria.requireRelevant = true;
        break;
    }
  }

  const report = await filter.generateFilterReport(criteria);
  console.log(filter.formatReport(report));
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PaperFilter;
