/**
 * 进展报告投递器
 * 支持文件投递 + Webhook 投递，带重试与幂等状态记录
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class DeliveryManager {
  constructor() {
    this.baseDir = path.join(__dirname, '../..');
    this.configPath = path.join(this.baseDir, 'config/report-delivery.json');
    this.statePath = path.join(this.baseDir, 'data/report-delivery-state.json');
    this.defaultConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 2000,
      requireAllSuccess: false,
      channels: [
        {
          type: 'file',
          enabled: true,
          path: 'reports/progress-delivery.log'
        },
        {
          type: 'webhook',
          enabled: false,
          url: '',
          timeoutMs: 10000,
          headers: {}
        }
      ]
    };
  }

  async loadConfig() {
    try {
      const raw = await fs.readFile(this.configPath, 'utf8');
      const cfg = JSON.parse(raw);
      return {
        ...this.defaultConfig,
        ...cfg,
        channels: Array.isArray(cfg.channels) ? cfg.channels : this.defaultConfig.channels
      };
    } catch {
      return this.defaultConfig;
    }
  }

  async loadState() {
    try {
      const raw = await fs.readFile(this.statePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { delivered: {} };
    }
  }

  async saveState(state) {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });

    const entries = Object.entries(state.delivered || {});
    const trimmed = entries.slice(-200);

    await fs.writeFile(
      this.statePath,
      JSON.stringify({ delivered: Object.fromEntries(trimmed) }, null, 2),
      'utf8'
    );
  }

  buildDeliveryKey(payload) {
    const generatedAt = payload?.report?.generatedAt || new Date().toISOString();
    const summary = payload?.report?.summary || {};
    return `${generatedAt}|${summary.totalPapers || 0}|${summary.highPriority || 0}`;
  }

  async withRetry(fn, { maxRetries, retryDelayMs }) {
    let lastError;
    const total = Math.max(1, maxRetries + 1);
    for (let attempt = 1; attempt <= total; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        if (attempt < total) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
        }
      }
    }
    throw lastError;
  }

  async deliverToFile(channel, payload) {
    const targetPath = path.isAbsolute(channel.path)
      ? channel.path
      : path.join(this.baseDir, channel.path);

    const line = JSON.stringify({
      deliveredAt: new Date().toISOString(),
      generatedAt: payload.report.generatedAt,
      summary: payload.report.summary,
      files: payload.savedFiles,
      textSummary: payload.textSummary
    });

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.appendFile(targetPath, `${line}\n`, 'utf8');

    return { channel: 'file', target: targetPath };
  }

  async deliverToWebhook(channel, payload) {
    if (!channel.url) {
      throw new Error('webhook channel url is empty');
    }

    await axios.post(channel.url, {
      type: 'research-progress-report',
      generatedAt: payload.report.generatedAt,
      summary: payload.report.summary,
      statistics: payload.report.statistics,
      highlights: payload.report.highlights,
      savedFiles: payload.savedFiles,
      textSummary: payload.textSummary
    }, {
      timeout: channel.timeoutMs || 10000,
      headers: channel.headers || {}
    });

    return { channel: 'webhook', target: channel.url };
  }

  async deliver(payload) {
    const config = await this.loadConfig();
    const state = await this.loadState();
    const deliveryKey = this.buildDeliveryKey(payload);

    if (!config.enabled) {
      return { delivered: false, skipped: true, reason: 'disabled', deliveryKey };
    }

    if (state.delivered?.[deliveryKey]?.status === 'success') {
      return {
        delivered: true,
        skipped: true,
        reason: 'already-delivered',
        deliveryKey,
        results: state.delivered[deliveryKey].results || []
      };
    }

    const channels = (config.channels || []).filter(c => c && c.enabled);
    if (channels.length === 0) {
      return { delivered: false, skipped: true, reason: 'no-enabled-channel', deliveryKey };
    }

    const results = [];

    for (const channel of channels) {
      try {
        const result = await this.withRetry(async () => {
          if (channel.type === 'file') {
            return await this.deliverToFile(channel, payload);
          }
          if (channel.type === 'webhook') {
            return await this.deliverToWebhook(channel, payload);
          }
          throw new Error(`unsupported channel type: ${channel.type}`);
        }, {
          maxRetries: config.maxRetries,
          retryDelayMs: config.retryDelayMs
        });

        results.push({ ...result, success: true });
      } catch (error) {
        results.push({ channel: channel.type, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const delivered = config.requireAllSuccess
      ? successCount === channels.length
      : successCount > 0;

    state.delivered[deliveryKey] = {
      status: delivered ? 'success' : 'failed',
      updatedAt: new Date().toISOString(),
      results
    };
    await this.saveState(state);

    return { delivered, deliveryKey, results, successCount, totalChannels: channels.length };
  }
}

module.exports = DeliveryManager;
