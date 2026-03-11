/**
 * Research Assistant - 智能物联感知与处理研究门户
 * 主入口文件
 */

const PaperFetcher = require('./fetchers/papers');
const ProgressReporter = require('./reporters/progress');
const venueMatcher = require('./utils/venueMatcher');

class ResearchAssistant {
  constructor() {
    this.fetcher = new PaperFetcher();
    this.reporter = new ProgressReporter();
  }

  /**
   * 显示系统信息
   */
  showInfo() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🔬 Research Assistant - 智能物联感知与处理研究门户          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    const stats = venueMatcher.getStats();
    if (stats) {
      console.log('📚 白名单配置:');
      console.log(`   顶级期刊/会议: ${stats.topTierVenues} 个`);
      console.log(`   二区期刊/会议: ${stats.tier2Venues} 个`);
      console.log(`   研究方向关键词: ${stats.researchKeywords} 个`);
    }
    console.log('');
  }

  /**
   * 执行论文抓取
   */
  async fetchPapers(options = {}) {
    console.log('[ResearchAssistant] 开始抓取论文...\n');
    
    const result = await this.fetcher.fetch({
      arxiv: {
        maxResults: options.maxResults || 50,
        query: options.query
      },
      filter: {
        minTier: options.minTier || 0,
        requireRelevant: options.requireRelevant || false,
        topN: options.topN || 30
      }
    });

    if (result.success) {
      console.log('\n✅ 抓取完成!');
      console.log(`   获取: ${result.fetched} 篇`);
      console.log(`   新增: ${result.newPapers} 篇`);
      console.log(`   总计: ${result.total} 篇`);
      console.log(`   高优先级: ${result.highPriority} 篇`);
      console.log(`   中优先级: ${result.mediumPriority} 篇`);
      console.log(`   耗时: ${result.duration}ms`);
    } else {
      console.error('\n❌ 抓取失败:', result.error);
    }

    return result;
  }

  /**
   * 生成进展报告
   */
  async generateReport(options = {}) {
    console.log('[ResearchAssistant] 生成进展报告...\n');
    
    const result = await this.reporter.generateAndSave({
      includePapers: options.includePapers !== false,
      includeStats: true,
      maxPapers: options.maxPapers || 10,
      format: options.format || 'both'
    });

    console.log('✅ 报告已生成:');
    for (const file of result.savedFiles) {
      console.log(`   📄 ${file}`);
    }

    return result;
  }

  /**
   * 显示统计信息
   */
  async showStats() {
    const stats = await this.fetcher.getStats();
    
    console.log('\n📊 数据统计');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`总论文数: ${stats.totalPapers}`);
    console.log('');
    console.log('按优先级分布:');
    console.log(`  HIGH:   ${stats.byPriority.HIGH}`);
    console.log(`  MEDIUM: ${stats.byPriority.MEDIUM}`);
    console.log(`  LOW:    ${stats.byPriority.LOW}`);
    console.log(`  NONE:   ${stats.byPriority.NONE}`);
    console.log('');
    console.log('按来源分布:');
    for (const [source, count] of Object.entries(stats.bySource)) {
      console.log(`  ${source}: ${count}`);
    }
  }

  /**
   * 运行完整工作流
   */
  async runFullWorkflow() {
    this.showInfo();
    
    // 1. 抓取论文
    await this.fetchPapers({
      maxResults: 50,
      topN: 30
    });

    console.log('');

    // 2. 生成报告
    await this.generateReport({
      maxPapers: 10
    });

    console.log('\n✨ 工作流执行完成!');
  }
}

// 命令行处理
async function main() {
  const assistant = new ResearchAssistant();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'fetch':
      assistant.showInfo();
      await assistant.fetchPapers({
        maxResults: parseInt(process.argv[3]) || 50
      });
      break;
      
    case 'report':
      await assistant.generateReport({
        maxPapers: parseInt(process.argv[3]) || 10
      });
      break;
      
    case 'stats':
      assistant.showInfo();
      await assistant.showStats();
      break;
      
    case 'full':
    default:
      await assistant.runFullWorkflow();
      break;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('[ResearchAssistant] 错误:', error);
    process.exit(1);
  });
}

module.exports = ResearchAssistant;
