/**
 * 定时任务调度器
 * 实现整点/半点自动抓取和报告投递
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const PaperFetcher = require('../fetchers/papers');
const ProgressReporter = require('../reporters/progress');

class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
    this.logFile = path.join(__dirname, '../../data/scheduler-log.json');
    this.configFile = path.join(__dirname, '../../config/scheduler.json');
    this.defaultConfig = {
      enabled: true,
      fetchSchedule: '0,30 * * * *',  // 整点和半点
      reportSchedule: '0,30 * * * *', // 整点和半点
      maxRetries: 3,
      retryDelayMs: 5000,
      notifications: {
        enabled: true,
        onFetch: true,
        onReport: true,
        onError: true
      }
    };
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      return { ...this.defaultConfig, ...JSON.parse(data) };
    } catch (error) {
      return this.defaultConfig;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(config) {
    await fs.mkdir(path.dirname(this.configFile), { recursive: true });
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
  }

  /**
   * 记录日志
   */
  async log(event) {
    try {
      let logs = [];
      try {
        const data = await fs.readFile(this.logFile, 'utf8');
        logs = JSON.parse(data);
      } catch (e) {
        // 文件不存在或格式错误
      }

      logs.push({
        timestamp: new Date().toISOString(),
        ...event
      });

      // 只保留最近100条日志
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }

      await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('[Scheduler] 日志记录失败:', error.message);
    }
  }

  /**
   * 执行论文抓取任务
   */
  async runFetchTask() {
    const startTime = Date.now();
    console.log(`\n[Scheduler] ${new Date().toLocaleString('zh-CN')} - 开始抓取任务`);

    try {
      const fetcher = new PaperFetcher();
      const result = await fetcher.fetch({
        arxiv: { maxResults: 50 },
        filter: { requireRelevant: true }
      });
      
      const duration = Date.now() - startTime;
      const summary = {
        type: 'fetch',
        status: result.success ? 'success' : 'error',
        duration,
        results: {
          fetched: result.fetched || 0,
          newPapers: result.newPapers || 0,
          total: result.total || 0,
          highPriority: result.highPriority || 0,
          mediumPriority: result.mediumPriority || 0
        }
      };

      await this.log(summary);
      
      if (result.success) {
        console.log(`[Scheduler] 抓取完成: 获取 ${summary.results.fetched} 篇, 新增 ${summary.results.newPapers} 篇, 总计 ${summary.results.total} 篇, 耗时 ${duration}ms`);
      } else {
        console.error(`[Scheduler] 抓取失败: ${result.error}`);
      }

      return { success: result.success, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.log({
        type: 'fetch',
        status: 'error',
        duration,
        error: error.message
      });
      console.error('[Scheduler] 抓取失败:', error.message);
      return { success: false, error: error.message, duration };
    }
  }

  /**
   * 执行报告生成任务
   */
  async runReportTask() {
    const startTime = Date.now();
    console.log(`\n[Scheduler] ${new Date().toLocaleString('zh-CN')} - 开始生成报告`);

    try {
      const reporter = new ProgressReporter();
      const result = await reporter.generateAndSave({
        includePapers: true,
        includeStats: true,
        maxPapers: 10,
        format: 'both'
      });

      const duration = Date.now() - startTime;
      const summary = {
        type: 'report',
        status: 'success',
        duration,
        files: result.savedFiles.map(f => path.basename(f)),
        summary: {
          totalPapers: result.report.summary?.totalPapers || 0,
          highPriority: result.report.summary?.highPriority || 0
        }
      };

      await this.log(summary);
      console.log(`[Scheduler] 报告生成完成: ${result.savedFiles.length} 个文件, 耗时 ${duration}ms`);
      console.log('[Scheduler] 文件列表:');
      result.savedFiles.forEach(f => console.log(`  - ${f}`));

      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.log({
        type: 'report',
        status: 'error',
        duration,
        error: error.message
      });
      console.error('[Scheduler] 报告生成失败:', error.message);
      return { success: false, error: error.message, duration };
    }
  }

  /**
   * 组合任务：抓取 + 报告
   */
  async runCombinedTask() {
    console.log('\n' + '='.repeat(60));
    console.log(`[Scheduler] 组合任务开始 - ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(60));

    // 1. 先执行抓取
    const fetchResult = await this.runFetchTask();
    
    // 2. 无论抓取是否成功，都尝试生成报告
    const reportResult = await this.runReportTask();

    const combinedResult = {
      timestamp: new Date().toISOString(),
      fetch: fetchResult,
      report: reportResult,
      success: fetchResult.success && reportResult.success
    };

    await this.log({
      type: 'combined',
      status: combinedResult.success ? 'success' : 'partial',
      fetchSuccess: fetchResult.success,
      reportSuccess: reportResult.success
    });

    console.log('\n' + '='.repeat(60));
    console.log(`[Scheduler] 组合任务结束 - 状态: ${combinedResult.success ? '成功' : '部分失败'}`);
    console.log('='.repeat(60) + '\n');

    return combinedResult;
  }

  /**
   * 启动定时任务
   */
  async start() {
    if (this.isRunning) {
      console.log('[Scheduler] 调度器已在运行');
      return;
    }

    const config = await this.loadConfig();
    
    if (!config.enabled) {
      console.log('[Scheduler] 调度器已禁用');
      return;
    }

    console.log('[Scheduler] 启动定时任务调度器...');
    console.log(`[Scheduler] 抓取/报告时间表: ${config.fetchSchedule}`);

    // 创建定时任务 - 整点和半点执行
    const task = cron.schedule(config.fetchSchedule, async () => {
      await this.runCombinedTask();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set('main', task);
    this.isRunning = true;

    await this.log({
      type: 'scheduler',
      status: 'started',
      schedule: config.fetchSchedule
    });

    console.log('[Scheduler] 定时任务已启动，将在整点和半点自动执行');
    console.log('[Scheduler] 按 Ctrl+C 停止');

    // 保持进程运行
    return new Promise((resolve) => {
      process.on('SIGINT', async () => {
        console.log('\n[Scheduler] 收到停止信号，正在关闭...');
        await this.stop();
        resolve();
      });
    });
  }

  /**
   * 停止定时任务
   */
  async stop() {
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`[Scheduler] 任务 "${name}" 已停止`);
    }
    this.tasks.clear();
    this.isRunning = false;

    await this.log({
      type: 'scheduler',
      status: 'stopped'
    });

    console.log('[Scheduler] 调度器已停止');
  }

  /**
   * 立即执行一次（手动触发）
   */
  async runOnce() {
    console.log('[Scheduler] 手动触发任务执行...');
    return await this.runCombinedTask();
  }

  /**
   * 获取调度器状态
   */
  async getStatus() {
    const config = await this.loadConfig();
    let logs = [];
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      logs = JSON.parse(data);
    } catch (e) {
      // 忽略错误
    }

    return {
      isRunning: this.isRunning,
      enabled: config.enabled,
      schedule: config.fetchSchedule,
      activeTasks: this.tasks.size,
      recentLogs: logs.slice(-10)
    };
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const scheduler = new TaskScheduler();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      scheduler.start().catch(error => {
        console.error('[Scheduler] 启动失败:', error);
        process.exit(1);
      });
      break;
    
    case 'once':
      scheduler.runOnce().then(result => {
        console.log('\n[Scheduler] 手动执行完成');
        process.exit(result.success ? 0 : 1);
      }).catch(error => {
        console.error('[Scheduler] 执行失败:', error);
        process.exit(1);
      });
      break;
    
    case 'status':
      scheduler.getStatus().then(status => {
        console.log('\n[Scheduler] 当前状态:');
        console.log(JSON.stringify(status, null, 2));
        process.exit(0);
      });
      break;
    
    default:
      console.log('\nUsage: node src/scheduler/index.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  start   - Start the scheduler');
      console.log('  once    - Run task once immediately');
      console.log('  status  - Check scheduler status');
      console.log('');
      process.exit(0);
  }
}

module.exports = TaskScheduler;
