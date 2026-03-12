/**
 * 论文质量筛选与可视化工具
 * 提供分层筛选、统计、可视化和报告落盘功能
 */

const fs = require('fs').promises;
const path = require('path');

class PaperFilter {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.reportsDir = path.join(__dirname, '../../reports');
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
   * 统一数据结构（兼容新旧格式）
   */
  normalizePaper(paper) {
    const base = paper.paper || paper;
    const tierFromLegacyScore = Math.round((paper.venueAnalysis?.tierScore || 0) / 100) || 0;
    const tier = paper.venueInfo?.tier ?? tierFromLegacyScore;

    const qualityScore =
      paper.qualityScore ??
      paper.venueInfo?.tierScore ??
      paper.venueAnalysis?.tierScore ??
      0;

    const priority = paper.priority || this.inferPriorityFromScore(qualityScore);
    const venue =
      paper.venueInfo?.abbreviation ||
      paper.venueInfo?.name ||
      paper.venueAnalysis?.matched?.abbr ||
      paper.venueAnalysis?.matched?.name ||
      base.venue ||
      'Unknown';

    return {
      raw: paper,
      id: base.id || paper.id,
      title: base.title || paper.title || 'Untitled',
      abstract: base.abstract || base.summary || paper.abstract || '',
      published: base.published || paper.published || null,
      source: base.source || paper.source || 'Unknown',
      tier,
      venue,
      priority,
      qualityScore,
      relevant: !!paper.relevance?.relevant,
      matchedKeywords: paper.relevance?.matchedKeywords || []
    };
  }

  inferPriorityFromScore(score) {
    if (score >= 80) return 'HIGH';
    if (score >= 60) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'NONE';
  }

  /**
   * 质量分层桶
   */
  getQualityBucket(score) {
    if (score >= 90) return 'S(90-100)';
    if (score >= 75) return 'A(75-89)';
    if (score >= 60) return 'B(60-74)';
    if (score >= 40) return 'C(40-59)';
    return 'D(0-39)';
  }

  /**
   * 筛选论文
   */
  filter(papers, criteria = {}) {
    const {
      minTier = 0,
      maxTier = 2,
      priorities = ['HIGH', 'MEDIUM', 'LOW'],
      requireRelevant = false,
      minQualityScore = 0,
      sources = [],
      keywords = [],
      dateRange = null,
      venues = []
    } = criteria;

    const normalized = papers.map(p => this.normalizePaper(p));

    return normalized.filter(p => {
      if (p.tier < minTier || p.tier > maxTier) return false;
      if (!priorities.includes(p.priority)) return false;
      if (requireRelevant && !p.relevant) return false;
      if (p.qualityScore < minQualityScore) return false;

      if (sources.length > 0 && !sources.includes(p.source)) return false;

      if (keywords.length > 0) {
        const hasKeyword = keywords.some(kw =>
          p.matchedKeywords.some(pk => pk.toLowerCase().includes(String(kw).toLowerCase()))
        );
        if (!hasKeyword) return false;
      }

      if (venues.length > 0) {
        const v = String(p.venue).toLowerCase();
        if (!venues.some(item => v.includes(String(item).toLowerCase()))) {
          return false;
        }
      }

      if (dateRange && p.published) {
        const pubDate = new Date(p.published);
        if (dateRange.start && pubDate < new Date(dateRange.start)) return false;
        if (dateRange.end && pubDate > new Date(dateRange.end)) return false;
      }

      return true;
    });
  }

  /**
   * 按维度分组统计
   */
  groupBy(papers, dimension) {
    const groups = {};

    for (const paper of papers) {
      let key;
      switch (dimension) {
        case 'tier':
          key = `Tier ${paper.tier}`;
          break;
        case 'priority':
          key = paper.priority || 'NONE';
          break;
        case 'venue':
          key = paper.venue || 'Unknown';
          break;
        case 'source':
          key = paper.source || 'Unknown';
          break;
        case 'month': {
          const date = paper.published ? new Date(paper.published) : null;
          key = date && !isNaN(date.getTime())
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            : 'Unknown';
          break;
        }
        case 'qualityBucket':
          key = this.getQualityBucket(paper.qualityScore || 0);
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
          title: paper.title,
          priority: paper.priority,
          qualityScore: paper.qualityScore
        });
      }
    }

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
    const normalized = papers.map(p => this.normalizePaper(p));
    const filtered = this.filter(papers, criteria);

    return {
      generatedAt: new Date().toISOString(),
      totalPapers: normalized.length,
      filteredPapers: filtered.length,
      criteria,
      summary: {
        byTier: this.groupBy(filtered, 'tier'),
        byPriority: this.groupBy(filtered, 'priority'),
        byVenue: this.groupBy(filtered, 'venue'),
        bySource: this.groupBy(filtered, 'source'),
        byQualityBucket: this.groupBy(filtered, 'qualityBucket')
      },
      topPapers: [...filtered]
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 10)
        .map(p => ({
          title: p.title,
          venue: p.venue,
          tier: p.tier,
          priority: p.priority,
          qualityScore: p.qualityScore,
          matchedKeywords: p.matchedKeywords.slice(0, 5)
        }))
    };
  }

  renderBar(count, total, width = 28) {
    if (!total) return ''.padEnd(width, '░');
    const fill = Math.round((count / total) * width);
    return `${'█'.repeat(fill)}${'░'.repeat(Math.max(0, width - fill))}`;
  }

  sectionWithBars(title, data, total) {
    const lines = [title, '─────────────────────────────────────────────────────────────'];
    const entries = Object.entries(data);

    if (entries.length === 0) {
      lines.push('  (无数据)');
      lines.push('');
      return lines;
    }

    for (const [name, info] of entries) {
      const bar = this.renderBar(info.count, total);
      lines.push(`  ${String(name).padEnd(18)} ${bar} ${info.count}`);
    }
    lines.push('');
    return lines;
  }

  /**
   * 格式化报告为文本（含可视化条形图）
   */
  formatReport(report) {
    const lines = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║       📊 论文质量分层与可视化筛选报告                         ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`生成时间: ${report.generatedAt}`);
    lines.push(`原始论文数: ${report.totalPapers}`);
    lines.push(`筛选后数量: ${report.filteredPapers}`);
    lines.push('');

    lines.push(...this.sectionWithBars('📚 等级分布', report.summary.byTier, report.filteredPapers));
    lines.push(...this.sectionWithBars('🎯 优先级分布', report.summary.byPriority, report.filteredPapers));
    lines.push(...this.sectionWithBars('🧪 质量桶分布', report.summary.byQualityBucket, report.filteredPapers));

    if (Object.keys(report.summary.byVenue).length > 0) {
      const topVenue = Object.entries(report.summary.byVenue).slice(0, 10)
        .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
      lines.push(...this.sectionWithBars('🏛️ Venue分布 (Top 10)', topVenue, report.filteredPapers));
    }

    if (report.topPapers.length > 0) {
      lines.push('🌟 高质量论文 Top 10');
      lines.push('─────────────────────────────────────────────────────────────');
      report.topPapers.forEach((p, i) => {
        lines.push(`\n[${i + 1}] ${p.title}`);
        lines.push(`    Venue: ${p.venue || 'Unknown'} | Tier: ${p.tier}`);
        lines.push(`    优先级: ${p.priority} | 质量分: ${p.qualityScore}`);
        if (p.matchedKeywords.length > 0) {
          lines.push(`    关键词: ${p.matchedKeywords.join(', ')}`);
        }
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  toMarkdown(report) {
    const md = [];
    md.push('# 论文质量分层与可视化筛选报告');
    md.push('');
    md.push(`- 生成时间: ${report.generatedAt}`);
    md.push(`- 原始论文数: ${report.totalPapers}`);
    md.push(`- 筛选后数量: ${report.filteredPapers}`);
    md.push('');

    const addTable = (title, data) => {
      md.push(`## ${title}`);
      md.push('');
      md.push('| 维度 | 数量 |');
      md.push('|---|---:|');
      for (const [k, v] of Object.entries(data)) {
        md.push(`| ${k} | ${v.count} |`);
      }
      md.push('');
    };

    addTable('等级分布', report.summary.byTier);
    addTable('优先级分布', report.summary.byPriority);
    addTable('质量桶分布', report.summary.byQualityBucket);

    md.push('## 高质量论文 Top 10');
    md.push('');
    report.topPapers.forEach((p, idx) => {
      md.push(`${idx + 1}. **${p.title}**`);
      md.push(`   - Venue: ${p.venue || 'Unknown'} | Tier: ${p.tier}`);
      md.push(`   - 优先级: ${p.priority} | 质量分: ${p.qualityScore}`);
    });

    md.push('');
    return md.join('\n');
  }

  /**
   * 保存报告
   */
  async saveReport(report) {
    await fs.mkdir(this.reportsDir, { recursive: true });
    const ts = report.generatedAt.replace(/[:.]/g, '-');

    const jsonPath = path.join(this.reportsDir, `filter-report-${ts}.json`);
    const txtPath = path.join(this.reportsDir, `filter-report-${ts}.txt`);
    const mdPath = path.join(this.reportsDir, `filter-report-${ts}.md`);

    await Promise.all([
      fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8'),
      fs.writeFile(txtPath, this.formatReport(report), 'utf8'),
      fs.writeFile(mdPath, this.toMarkdown(report), 'utf8')
    ]);

    return { jsonPath, txtPath, mdPath };
  }
}

// 命令行接口
async function main() {
  const filter = new PaperFilter();
  const args = process.argv.slice(2);

  const criteria = {
    minTier: 0,
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'NONE']
  };

  let shouldSave = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--top-only':
        criteria.minTier = 1;
        break;
      case '--high-only':
        criteria.priorities = ['HIGH'];
        break;
      case '--min-tier':
        criteria.minTier = parseInt(args[++i], 10) || 0;
        break;
      case '--min-score':
        criteria.minQualityScore = parseInt(args[++i], 10) || 0;
        break;
      case '--relevant':
        criteria.requireRelevant = true;
        break;
      case '--source':
        criteria.sources = (criteria.sources || []).concat(String(args[++i] || '').split(',').filter(Boolean));
        break;
      case '--venue':
        criteria.venues = (criteria.venues || []).concat(String(args[++i] || '').split(',').filter(Boolean));
        break;
      case '--keyword':
        criteria.keywords = (criteria.keywords || []).concat(String(args[++i] || '').split(',').filter(Boolean));
        break;
      case '--save':
        shouldSave = true;
        break;
      default:
        break;
    }
  }

  const report = await filter.generateFilterReport(criteria);
  console.log(filter.formatReport(report));

  if (shouldSave) {
    const files = await filter.saveReport(report);
    console.log('\n📝 报告已保存:');
    console.log(`  JSON: ${files.jsonPath}`);
    console.log(`  TXT : ${files.txtPath}`);
    console.log(`  MD  : ${files.mdPath}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PaperFilter;
