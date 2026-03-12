/**
 * 进展汇报模块
 * 整点/半点自动生成并投递进展报告
 */

const fs = require('fs').promises;
const path = require('path');
const PaperFetcher = require('../fetchers/papers');
const venueMatcher = require('../utils/venueMatcher');

class ProgressReporter {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.reportsDir = path.join(__dirname, '../../reports');
    this.papersFile = path.join(this.dataDir, 'papers.json');
    this.historyFile = path.join(this.dataDir, 'fetch-history.json');
  }

  /**
   * 初始化目录
   */
  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  /**
   * 加载论文数据
   */
  async loadPapers() {
    try {
      const data = await fs.readFile(this.papersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 加载抓取历史
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 生成进展报告
   */
  async generateReport(options = {}) {
    const { 
      includePapers = true, 
      includeStats = true,
      maxPapers = 10 
    } = options;

    console.log('[ProgressReporter] 生成进展报告...');

    const papers = await this.loadPapers();
    const history = await this.loadHistory();
    const venueStats = venueMatcher.getStats();

    const now = new Date();
    const report = {
      generatedAt: now.toISOString(),
      timestamp: now.getTime(),
      summary: {},
      highlights: [],
      statistics: {},
      recentActivity: []
    };

    // 1. 统计摘要
    if (includeStats) {
      report.summary = {
        totalPapers: papers.length,
        highPriority: papers.filter(p => p.priority === 'HIGH').length,
        mediumPriority: papers.filter(p => p.priority === 'MEDIUM').length,
        lowPriority: papers.filter(p => p.priority === 'LOW').length,
        lastFetch: history.length > 0 ? history[history.length - 1].timestamp : null,
        totalFetches: history.length
      };
    }

    // 2. 重点推荐（高质量论文）
    if (includePapers) {
      const highPriority = papers
        .filter(p => p.priority === 'HIGH')
        .slice(0, maxPapers);
      
      const mediumPriority = papers
        .filter(p => p.priority === 'MEDIUM')
        .slice(0, Math.max(0, maxPapers - highPriority.length));

      report.highlights = [...highPriority, ...mediumPriority].map(p => ({
        title: p.paper?.title || p.title,
        authors: (p.paper?.authors || p.authors || []).slice(0, 3).join(', ') + 
                 ((p.paper?.authors || p.authors || []).length > 3 ? ' et al.' : ''),
        venue: p.venueInfo?.name || p.paper?.venue || 'Unknown',
        venueAbbreviation: p.venueInfo?.abbreviation || '',
        venueTier: p.venueInfo?.tier || 0,
        venueTierLabel: p.venueInfo?.tierLabel || '',
        venueTierScore: p.venueInfo?.tierScore || 0,
        priority: p.priority,
        qualityScore: p.qualityScore,
        recommendation: p.recommendation,
        link: p.paper?.link || p.link,
        matchedKeywords: p.relevance?.matchedKeywords?.slice(0, 5) || [],
        relevanceScore: p.relevance?.score || 0,
        published: p.paper?.published
      }));
    }

    // 3. 详细统计
    report.statistics = {
      venueStats,
      byPriority: {
        HIGH: papers.filter(p => p.priority === 'HIGH').length,
        MEDIUM: papers.filter(p => p.priority === 'MEDIUM').length,
        LOW: papers.filter(p => p.priority === 'LOW').length,
        NONE: papers.filter(p => p.priority === 'NONE').length
      },
      byTier: this.countByTier(papers),
      bySource: this.countBySource(papers),
      topVenues: this.countTopVenues(papers),
      venueDistribution: this.getVenueDistribution(papers)
    };

    // 4. 最近活动
    report.recentActivity = history.slice(-5).reverse();

    return report;
  }

  /**
   * 按来源统计
   */
  countBySource(papers) {
    const counts = {};
    for (const paper of papers) {
      const source = paper.paper?.source || paper.source || 'unknown';
      counts[source] = (counts[source] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按等级统计
   */
  countByTier(papers) {
    const counts = { 1: 0, 2: 0, 0: 0 };
    for (const paper of papers) {
      const tier = paper.venueInfo?.tier || 0;
      counts[tier] = (counts[tier] || 0) + 1;
    }
    return {
      topTier: counts[1],
      tier2: counts[2],
      other: counts[0]
    };
  }

  /**
   * 获取Venue分布详情
   */
  getVenueDistribution(papers) {
    const distribution = {};
    for (const paper of papers) {
      if (paper.venueInfo && paper.venueInfo.tier === 1) {
        const key = paper.venueInfo.abbreviation || paper.venueInfo.name;
        if (!distribution[key]) {
          distribution[key] = {
            name: paper.venueInfo.name,
            abbreviation: paper.venueInfo.abbreviation,
            count: 0,
            papers: []
          };
        }
        distribution[key].count++;
        if (distribution[key].papers.length < 3) {
          distribution[key].papers.push({
            title: paper.paper?.title || paper.title,
            priority: paper.priority
          });
        }
      }
    }
    return Object.entries(distribution)
      .sort((a, b) => b[1].count - a[1].count)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }

  /**
   * 统计顶级期刊会议
   */
  countTopVenues(papers) {
    const counts = {};
    for (const paper of papers) {
      if (paper.venueInfo && paper.venueInfo.tier === 1) {
        const name = paper.venueInfo.abbreviation || paper.venueInfo.name;
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  /**
   * 格式化报告为文本
   */
  formatAsText(report) {
    const lines = [];
    const now = new Date(report.generatedAt);
    
    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║           📊 智能物联感知与处理 - 研究进展报告                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`⏰ 生成时间: ${now.toLocaleString('zh-CN')}`);
    lines.push('');

    // 摘要
    if (report.summary) {
      lines.push('📈 数据概览');
      lines.push('─────────────────────────────────────────────────────────────');
      lines.push(`  总论文数: ${report.summary.totalPapers}`);
      lines.push(`  高优先级: ${report.summary.highPriority} 篇`);
      lines.push(`  中优先级: ${report.summary.mediumPriority} 篇`);
      lines.push(`  低优先级: ${report.summary.lowPriority} 篇`);
      if (report.summary.lastFetch) {
        const lastFetch = new Date(report.summary.lastFetch);
        lines.push(`  最后抓取: ${lastFetch.toLocaleString('zh-CN')}`);
      }
      lines.push('');
    }

    // 重点推荐
    if (report.highlights && report.highlights.length > 0) {
      lines.push('🌟 重点推荐论文');
      lines.push('─────────────────────────────────────────────────────────────');
      
      for (let i = 0; i < report.highlights.length; i++) {
        const p = report.highlights[i];
        lines.push(`\n[${i + 1}] ${p.title}`);
        lines.push(`    作者: ${p.authors}`);
        lines.push(`    来源: ${p.venue} ${p.venueTier === 1 ? '⭐' : ''}`);
        lines.push(`    优先级: ${p.priority} | 质量分: ${p.qualityScore}`);
        if (p.matchedKeywords.length > 0) {
          lines.push(`    关键词: ${p.matchedKeywords.join(', ')}`);
        }
        if (p.link) {
          lines.push(`    链接: ${p.link}`);
        }
      }
      lines.push('');
    }

    // 统计信息
    if (report.statistics) {
      lines.push('📊 详细统计');
      lines.push('─────────────────────────────────────────────────────────────');
      
      if (report.statistics.venueStats) {
        const vs = report.statistics.venueStats;
        lines.push(`  白名单期刊/会议: ${vs.totalVenues} 个`);
        lines.push(`    - 顶级: ${vs.topTierVenues} 个`);
        lines.push(`    - 二区: ${vs.tier2Venues} 个`);
        lines.push(`  研究方向关键词: ${vs.researchKeywords} 个`);
      }
      lines.push('');

      if (report.statistics.byTier) {
        lines.push('  论文等级分布:');
        lines.push(`    ⭐ 顶级 (Tier 1): ${report.statistics.byTier.topTier} 篇`);
        lines.push(`    🥈 二区 (Tier 2): ${report.statistics.byTier.tier2} 篇`);
        lines.push(`    📄 其他: ${report.statistics.byTier.other} 篇`);
        lines.push('');
      }

      if (report.statistics.topVenues.length > 0) {
        lines.push('  热门顶刊顶会:');
        for (const [venue, count] of report.statistics.topVenues) {
          lines.push(`    • ${venue}: ${count} 篇`);
        }
        lines.push('');
      }
    }

    // 最近活动
    if (report.recentActivity.length > 0) {
      lines.push('📝 最近抓取记录');
      lines.push('─────────────────────────────────────────────────────────────');
      for (const activity of report.recentActivity) {
        const time = new Date(activity.timestamp);
        lines.push(`  [${time.toLocaleTimeString('zh-CN')}] ${activity.source}: ` +
                   `获取 ${activity.fetched} 篇, 新增 ${activity.newPapers} 篇`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    科研助手 - 自动生成的报告                    ');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * 格式化报告为 Markdown
   */
  formatAsMarkdown(report) {
    const lines = [];
    const now = new Date(report.generatedAt);
    
    lines.push('# 📊 智能物联感知与处理 - 研究进展报告');
    lines.push('');
    lines.push(`**生成时间:** ${now.toLocaleString('zh-CN')}`);
    lines.push('');

    // 摘要
    if (report.summary) {
      lines.push('## 📈 数据概览');
      lines.push('');
      lines.push('| 指标 | 数值 |');
      lines.push('|------|------|');
      lines.push(`| 总论文数 | ${report.summary.totalPapers} |`);
      lines.push(`| 高优先级 | ${report.summary.highPriority} 篇 |`);
      lines.push(`| 中优先级 | ${report.summary.mediumPriority} 篇 |`);
      lines.push(`| 低优先级 | ${report.summary.lowPriority} 篇 |`);
      if (report.summary.lastFetch) {
        lines.push(`| 最后抓取 | ${new Date(report.summary.lastFetch).toLocaleString('zh-CN')} |`);
      }
      lines.push('');
    }

    // 重点推荐
    if (report.highlights && report.highlights.length > 0) {
      lines.push('## 🌟 重点推荐论文');
      lines.push('');
      
      for (let i = 0; i < report.highlights.length; i++) {
        const p = report.highlights[i];
        lines.push(`### ${i + 1}. ${p.title}`);
        lines.push('');
        lines.push(`- **作者:** ${p.authors}`);
        lines.push(`- **来源:** ${p.venue} ${p.venueTier === 1 ? '⭐' : ''}`);
        lines.push(`- **优先级:** ${p.priority} | **质量分:** ${p.qualityScore}`);
        if (p.matchedKeywords.length > 0) {
          lines.push(`- **关键词:** ${p.matchedKeywords.join(', ')}`);
        }
        if (p.link) {
          lines.push(`- **链接:** [查看论文](${p.link})`);
        }
        lines.push('');
      }
    }

    // 统计信息
    if (report.statistics) {
      lines.push('## 📊 详细统计');
      lines.push('');
      
      if (report.statistics.venueStats) {
        const vs = report.statistics.venueStats;
        lines.push('### 白名单配置');
        lines.push(`- 期刊/会议总数: ${vs.totalVenues} 个`);
        lines.push(`  - 顶级: ${vs.topTierVenues} 个`);
        lines.push(`  - 二区: ${vs.tier2Venues} 个`);
        lines.push(`- 研究方向关键词: ${vs.researchKeywords} 个`);
        lines.push('');
      }

      if (report.statistics.topVenues.length > 0) {
        lines.push('### 热门顶刊顶会');
        lines.push('');
        for (const [venue, count] of report.statistics.topVenues) {
          lines.push(`- ${venue}: ${count} 篇`);
        }
        lines.push('');
      }
    }

    // 最近活动
    if (report.recentActivity.length > 0) {
      lines.push('## 📝 最近抓取记录');
      lines.push('');
      lines.push('| 时间 | 来源 | 获取 | 新增 |');
      lines.push('|------|------|------|------|');
      for (const activity of report.recentActivity) {
        const time = new Date(activity.timestamp);
        lines.push(`| ${time.toLocaleTimeString('zh-CN')} | ${activity.source} | ${activity.fetched} | ${activity.newPapers} |`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('*科研助手 - 自动生成的报告*');

    return lines.join('\n');
  }

  /**
   * 保存报告
   */
  async saveReport(report, format = 'both') {
    await this.init();
    
    const timestamp = new Date(report.generatedAt);
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(':').slice(0, 2).join('');
    const filename = `report-${dateStr}-${timeStr}`;

    const saved = [];

    if (format === 'text' || format === 'both') {
      const textContent = this.formatAsText(report);
      const textPath = path.join(this.reportsDir, `${filename}.txt`);
      const latestTextPath = path.join(this.reportsDir, 'latest-report.txt');
      await fs.writeFile(textPath, textContent);
      await fs.writeFile(latestTextPath, textContent);
      saved.push(textPath, latestTextPath);
    }

    if (format === 'markdown' || format === 'both') {
      const mdContent = this.formatAsMarkdown(report);
      const mdPath = path.join(this.reportsDir, `${filename}.md`);
      const latestMdPath = path.join(this.reportsDir, 'latest-report.md');
      await fs.writeFile(mdPath, mdContent);
      await fs.writeFile(latestMdPath, mdContent);
      saved.push(mdPath, latestMdPath);
    }

    // 同时保存 JSON 格式
    const jsonContent = JSON.stringify(report, null, 2);
    const jsonPath = path.join(this.reportsDir, `${filename}.json`);
    const latestJsonPath = path.join(this.reportsDir, 'latest-report.json');
    await fs.writeFile(jsonPath, jsonContent);
    await fs.writeFile(latestJsonPath, jsonContent);
    saved.push(jsonPath, latestJsonPath);

    return saved;
  }

  /**
   * 生成并保存报告
   */
  async generateAndSave(options = {}) {
    const report = await this.generateReport(options);
    const saved = await this.saveReport(report, options.format || 'both');
    
    return {
      report,
      savedFiles: saved,
      textSummary: this.formatAsText(report)
    };
  }

  /**
   * 检查是否需要生成报告（整点或半点）
   */
  shouldGenerateReport() {
    const now = new Date();
    const minutes = now.getMinutes();
    return minutes === 0 || minutes === 30;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const reporter = new ProgressReporter();
  reporter.generateAndSave({
    includePapers: true,
    includeStats: true,
    maxPapers: 10,
    format: 'both'
  }).then(result => {
    console.log('\n[ProgressReporter] 报告已生成:');
    console.log(result.savedFiles.join('\n'));
    console.log('\n' + result.textSummary);
    process.exit(0);
  }).catch(error => {
    console.error('[ProgressReporter] 错误:', error);
    process.exit(1);
  });
}

module.exports = ProgressReporter;
