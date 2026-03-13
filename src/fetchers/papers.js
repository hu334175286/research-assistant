/**
 * 论文抓取模块
 * 支持 arXiv、Google Scholar 等数据源
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const venueMatcher = require('../utils/venueMatcher');

class PaperFetcher {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.papersFile = path.join(this.dataDir, 'papers.json');
    this.historyFile = path.join(this.dataDir, 'fetch-history.json');
    this.venueSummaryFile = path.join(this.dataDir, 'venue-recognition-summary.json');
  }

  /**
   * 初始化数据目录
   */
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('[PaperFetcher] 初始化失败:', error.message);
    }
  }

  /**
   * 从 arXiv 抓取论文
   * @param {Object} options - 查询选项
   */
  async fetchFromArXiv(options = {}) {
    const {
      query = 'cat:cs.NI OR cat:cs.DC OR cat:cs.SY',
      maxResults = 50,
      sortBy = 'submittedDate',
      sortOrder = 'descending'
    } = options;

    console.log(`[PaperFetcher] 开始从 arXiv 抓取论文...`);
    
    try {
      // arXiv API endpoint
      const url = 'http://export.arxiv.org/api/query';
      const params = {
        search_query: query,
        start: 0,
        max_results: maxResults,
        sortBy,
        sortOrder
      };

      const response = await axios.get(url, { params, timeout: 30000 });
      const papers = this.parseArXivResponse(response.data);
      
      console.log(`[PaperFetcher] 从 arXiv 获取 ${papers.length} 篇论文`);
      return papers;
    } catch (error) {
      console.error('[PaperFetcher] arXiv 抓取失败:', error.message);
      return [];
    }
  }

  /**
   * 解析 arXiv XML 响应
   */
  parseArXivResponse(xmlData) {
    const papers = [];
    
    // 简单的 XML 解析（使用正则，避免引入额外依赖）
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries = xmlData.match(entryRegex) || [];

    for (const entry of entries) {
      try {
        const paper = {
          id: this.extractTag(entry, 'id'),
          title: this.cleanText(this.extractTag(entry, 'title')),
          summary: this.cleanText(this.extractTag(entry, 'summary')),
          authors: this.extractAuthors(entry),
          published: this.extractTag(entry, 'published'),
          updated: this.extractTag(entry, 'updated'),
          primaryCategory: this.extractAttribute(entry, 'arxiv:primary_category', 'term'),
          categories: this.extractCategories(entry),
          link: this.extractLink(entry),
          comments: this.extractTag(entry, 'arxiv:comment'),  // 提取arXiv评论（常含venue信息）
          journalRef: this.extractTag(entry, 'arxiv:journal_ref'),  // 提取期刊引用信息
          doi: this.extractTag(entry, 'arxiv:doi'),  // 提取DOI
          source: 'arXiv',
          fetchedAt: new Date().toISOString()
        };
        
        papers.push(paper);
      } catch (error) {
        console.warn('[PaperFetcher] 解析单篇论文失败:', error.message);
      }
    }

    return papers;
  }

  /**
   * 从 XML 中提取标签内容
   */
  extractTag(xml, tagName) {
    // 注意：这里必须使用双反斜杠，确保 RegExp 字符类正确识别换行
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 从 XML 中提取属性
   */
  extractAttribute(xml, tagName, attrName) {
    const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  /**
   * 提取作者列表
   */
  extractAuthors(entry) {
    const authorRegex = /<author>([\s\S]*?)<\/author>/g;
    const authors = [];
    let match;
    
    while ((match = authorRegex.exec(entry)) !== null) {
      const name = this.extractTag(match[1], 'name');
      if (name) authors.push(name);
    }
    
    return authors;
  }

  /**
   * 提取分类列表
   */
  extractCategories(entry) {
    const categories = [];
    const regex = /<category term="([^"]*)"/g;
    let match;
    
    while ((match = regex.exec(entry)) !== null) {
      categories.push(match[1]);
    }
    
    return categories;
  }

  /**
   * 提取论文链接
   */
  extractLink(entry) {
    const regex = /<link href="([^"]*)" rel="alternate"/;
    const match = entry.match(regex);
    return match ? match[1] : '';
  }

  /**
   * 清理文本
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * 评估并过滤论文
   * @param {Array} papers - 原始论文列表
   * @param {Object} options - 过滤选项
   */
  evaluateAndFilter(papers, options = {}) {
    const {
      minTier = 0,        // 最低等级要求（1=顶级, 2=二区）
      topVenueOnly = false,
      requireRelevant = false,  // 是否要求相关
      topN = null,        // 只返回前N篇
      includeArXivOnly = true,  // 是否包含仅arXiv的论文
      minVenueConfidence = 0.78 // venue识别最小置信阈值
    } = options;

    console.log(`[PaperFetcher] 开始评估 ${papers.length} 篇论文...`);

    // 使用 venueMatcher 评估所有论文
    // 优先从journalRef和comments中提取venue信息
    const sourceWeights = venueMatcher.getSourceWeights();

    const evaluatedRaw = venueMatcher.evaluatePapers(papers.map(p => {
      const classification = venueMatcher.classifyVenue([
        { name: 'journalRef', text: p.journalRef, weight: sourceWeights.journalRef || 1.0 },
        { name: 'comments', text: p.comments, weight: sourceWeights.comments || 0.95 },
        { name: 'venue', text: p.venue, weight: sourceWeights.venue || 0.9 },
        { name: 'primaryCategory', text: p.primaryCategory, weight: sourceWeights.primaryCategory || 0.5 }
      ]);

      const confidence = classification.best?.confidence || 0;
      const confidentMatched = classification.matched && confidence >= minVenueConfidence;

      const recognition = confidentMatched
        ? {
            matched: true,
            source: classification.best.source,
            confidence,
            matchType: classification.best.matchType,
            extractionMode: classification.best.extractionMode || 'direct',
            tier: classification.tier,
            isTopVenue: classification.isTopVenue,
            reasonCodes: classification.reasonCodes || []
          }
        : {
            matched: false,
            source: 'fallback',
            confidence,
            matchType: 'none',
            extractionMode: 'none',
            tier: 0,
            isTopVenue: false,
            reasonCodes: classification.matched
              ? [...(classification.reasonCodes || []), 'LOW_CONFIDENCE_REJECTED']
              : (classification.reasonCodes || ['NO_VENUE_SIGNAL'])
          };

      return {
        ...p,
        title: p.title,
        venue: classification.venueInfo?.name || p.primaryCategory || 'arXiv',
        abstract: p.summary,
        authors: p.authors,
        comments: p.comments,
        journalRef: p.journalRef,
        doi: p.doi,
        venueEvidence: classification.venueEvidence,
        venueRecognition: recognition,
        venueRecognitionCandidates: classification.candidates,
        recognizedVenueTier: classification.tier || 0,
        recognizedIsTopVenue: !!classification.isTopVenue
      };
    }));

    const evaluated = evaluatedRaw.map((item) => {
      const basePaper = item.paper || {};
      return {
        ...item,
        venueRecognition: item.venueRecognition || basePaper.venueRecognition,
        venueEvidence: item.venueEvidence || basePaper.venueEvidence,
        recognizedVenueTier: item.recognizedVenueTier || basePaper.recognizedVenueTier || item.venueInfo?.tier || 0,
        recognizedIsTopVenue: item.recognizedIsTopVenue || basePaper.recognizedIsTopVenue || item.venueInfo?.tier === 1,
        venueRecognitionCandidates: item.venueRecognitionCandidates || basePaper.venueRecognitionCandidates || []
      };
    });

    // 过滤
    let filtered = evaluated.filter(item => {
      // 检查等级要求（tier: 1顶级 > 2二区 > 0未知）
      const tier = item.venueInfo?.tier ?? item.recognizedVenueTier ?? item.venueRecognition?.tier ?? 0;

      if (topVenueOnly && tier !== 1) {
        return false;
      }

      if (minTier > 0) {
        const tierRank = (value) => {
          if (value === 1) return 3;
          if (value === 2) return 2;
          if (value === 3) return 1;
          return 0;
        };

        if (tierRank(tier) < tierRank(minTier)) {
          // 如果设置了includeArXivOnly，高相关性的arXiv论文也可以保留
          if (!includeArXivOnly || !item.relevance.isHighlyRelevant) {
            return false;
          }
        }
      }
      // 检查相关性要求
      if (requireRelevant && !item.relevance.relevant) {
        return false;
      }
      return true;
    });

    // 限制数量
    if (topN && topN > 0) {
      filtered = filtered.slice(0, topN);
    }

    console.log(`[PaperFetcher] 过滤后剩余 ${filtered.length} 篇论文`);
    
    // 输出统计信息
    const tierCounts = { 1: 0, 2: 0, 0: 0 };
    const priorityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
    const recognitionCounts = { matched: 0, unmatched: 0, highConfidence: 0 };
    const recognitionSourceCounts = { journalRef: 0, comments: 0, venue: 0, fallback: 0 };

    for (const item of filtered) {
      const tier = item.venueInfo?.tier || 0;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;

      const recognition = item.paper?.venueRecognition || item.venueRecognition;
      if (recognition?.matched) {
        recognitionCounts.matched += 1;
        if ((recognition.confidence || 0) >= 0.9) {
          recognitionCounts.highConfidence += 1;
        }
        const source = recognition.source || 'fallback';
        recognitionSourceCounts[source] = (recognitionSourceCounts[source] || 0) + 1;
      } else {
        recognitionCounts.unmatched += 1;
        recognitionSourceCounts.fallback += 1;
      }
    }

    console.log(`[PaperFetcher] 等级分布: 顶级=${tierCounts[1]}, 二区=${tierCounts[2]}, 其他=${tierCounts[0]}`);
    console.log(`[PaperFetcher] 优先级分布: 高=${priorityCounts.HIGH}, 中=${priorityCounts.MEDIUM}, 低=${priorityCounts.LOW}`);
    console.log(`[PaperFetcher] Venue识别: 命中=${recognitionCounts.matched}, 高置信=${recognitionCounts.highConfidence}, 未命中=${recognitionCounts.unmatched}`);
    console.log(`[PaperFetcher] Venue识别来源: journalRef=${recognitionSourceCounts.journalRef}, comments=${recognitionSourceCounts.comments}, venue=${recognitionSourceCounts.venue}, fallback=${recognitionSourceCounts.fallback}`);
    
    return filtered;
  }

  /**
   * 加载已保存的论文
   */
  async loadSavedPapers() {
    try {
      const data = await fs.readFile(this.papersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 保存论文到文件
   */
  async savePapers(papers) {
    await this.init();
    await fs.writeFile(this.papersFile, JSON.stringify(papers, null, 2));
    console.log(`[PaperFetcher] 已保存 ${papers.length} 篇论文到 ${this.papersFile}`);
  }

  /**
   * 合并新旧论文（去重）
   */
  mergePapers(existing, newPapers) {
    const idSet = new Set(existing.map(p => p.paper?.id || p.id));
    const merged = [...existing];
    
    for (const paper of newPapers) {
      const id = paper.paper?.id || paper.id;
      if (!idSet.has(id)) {
        merged.push(paper);
        idSet.add(id);
      }
    }
    
    return merged;
  }

  async saveVenueSummary(summary) {
    try {
      await fs.writeFile(this.venueSummaryFile, JSON.stringify(summary, null, 2));
    } catch (error) {
      console.warn('[PaperFetcher] 保存venue识别摘要失败:', error.message);
    }
  }

  /**
   * 记录抓取历史
   */
  async logFetch(fetchInfo) {
    try {
      let history = [];
      try {
        const data = await fs.readFile(this.historyFile, 'utf8');
        history = JSON.parse(data);
      } catch (e) {
        // 文件不存在，使用空数组
      }

      history.push({
        timestamp: new Date().toISOString(),
        ...fetchInfo
      });

      // 只保留最近100条记录
      if (history.length > 100) {
        history = history.slice(-100);
      }

      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.warn('[PaperFetcher] 记录历史失败:', error.message);
    }
  }

  /**
   * 主抓取流程
   */
  async fetch(options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. 抓取新论文
      const rawPapers = await this.fetchFromArXiv(options.arxiv);
      
      // 2. 评估和过滤
      const evaluated = this.evaluateAndFilter(rawPapers, options.filter);

      const venueSummary = {
        generatedAt: new Date().toISOString(),
        fetched: rawPapers.length,
        retained: evaluated.length,
        matched: evaluated.filter(p => p.venueRecognition?.matched).length,
        topVenue: evaluated.filter(p => p.venueRecognition?.isTopVenue).length,
        tierDistribution: {
          tier1: evaluated.filter(p => (p.venueInfo?.tier ?? p.recognizedVenueTier ?? p.venueRecognition?.tier ?? 0) === 1).length,
          tier2: evaluated.filter(p => (p.venueInfo?.tier ?? p.recognizedVenueTier ?? p.venueRecognition?.tier ?? 0) === 2).length,
          other: evaluated.filter(p => (p.venueInfo?.tier ?? p.recognizedVenueTier ?? p.venueRecognition?.tier ?? 0) === 0).length
        },
        sourceDistribution: evaluated.reduce((acc, p) => {
          const src = p.venueRecognition?.source || 'fallback';
          acc[src] = (acc[src] || 0) + 1;
          return acc;
        }, {}),
        reasonDistribution: evaluated.reduce((acc, p) => {
          for (const code of (p.venueRecognition?.reasonCodes || [])) {
            acc[code] = (acc[code] || 0) + 1;
          }
          return acc;
        }, {})
      };
      await this.saveVenueSummary(venueSummary);
      
      // 3. 加载已有论文
      const existing = await this.loadSavedPapers();
      
      // 4. 合并
      const merged = this.mergePapers(existing, evaluated);
      
      // 5. 保存
      await this.savePapers(merged);
      
      // 6. 记录历史
      await this.logFetch({
        source: 'arXiv',
        fetched: rawPapers.length,
        newPapers: evaluated.length,
        total: merged.length,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        fetched: rawPapers.length,
        newPapers: evaluated.length,
        total: merged.length,
        highPriority: evaluated.filter(p => p.priority === 'HIGH').length,
        mediumPriority: evaluated.filter(p => p.priority === 'MEDIUM').length,
        venueSummary,
        duration: Date.now() - startTime
      };
    } catch (error) {
      console.error('[PaperFetcher] 抓取流程失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    const papers = await this.loadSavedPapers();
    const history = await this.loadHistory();
    
    const stats = {
      totalPapers: papers.length,
      byPriority: {
        HIGH: papers.filter(p => p.priority === 'HIGH').length,
        MEDIUM: papers.filter(p => p.priority === 'MEDIUM').length,
        LOW: papers.filter(p => p.priority === 'LOW').length,
        NONE: papers.filter(p => p.priority === 'NONE').length
      },
      bySource: {},
      recentFetches: history.slice(-5)
    };

    // 按来源统计
    for (const paper of papers) {
      const source = paper.paper?.source || paper.source || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    }

    return stats;
  }

  /**
   * 加载历史记录
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const fetcher = new PaperFetcher();
  fetcher.fetch({
    arxiv: {
      maxResults: 30
    },
    filter: {
      topN: 20
    }
  }).then(result => {
    console.log('\n[PaperFetcher] 抓取结果:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }).catch(error => {
    console.error('[PaperFetcher] 错误:', error);
    process.exit(1);
  });
}

module.exports = PaperFetcher;
