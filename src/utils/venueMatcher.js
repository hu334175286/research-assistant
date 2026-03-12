/**
 * 顶刊顶会匹配工具
 * 用于识别论文所属的期刊/会议等级
 */

const fs = require('fs');
const path = require('path');

class VenueMatcher {
  constructor() {
    this.whitelist = null;
    this.venueMap = new Map(); // 归一化名称 -> venue
    this.keywordMap = new Map(); // 关键词到venue的映射
    this.abbrRegexList = []; // 缩写正则，避免子串误匹配
    this.loadWhitelist();
  }

  /**
   * 加载白名单配置
   */
  loadWhitelist() {
    try {
      const configPath = path.join(__dirname, '../../config/venue-whitelist.json');
      const data = fs.readFileSync(configPath, 'utf8');
      this.whitelist = JSON.parse(data);
      this.buildIndex();
      console.log('[VenueMatcher] 白名单加载成功');
    } catch (error) {
      console.error('[VenueMatcher] 加载白名单失败:', error.message);
      this.whitelist = { categories: {} };
    }
  }

  /**
   * 文本归一化：小写、去标点、压缩空白
   */
  normalizeText(text = '') {
    return text
      .toLowerCase()
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^a-z0-9&+\-\s/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 转义正则特殊字符
   */
  escapeRegExp(text = '') {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 构建快速查找索引
   */
  buildIndex() {
    if (!this.whitelist || !this.whitelist.categories) return;

    this.venueMap.clear();
    this.keywordMap.clear();
    this.abbrRegexList = [];

    for (const [categoryKey, category] of Object.entries(this.whitelist.categories)) {
      if (!category.venues) continue;

      for (const venue of category.venues) {
        const venueEntry = {
          ...venue,
          category: categoryKey,
          tier: category.tier
        };

        // 建立名称索引（规则化）
        const names = [
          venue.name,
          venue.abbreviation,
          ...(venue.abbreviation ? venue.abbreviation.split('-') : [])
        ]
          .filter(Boolean)
          .map((s) => this.normalizeText(s));

        for (const name of names) {
          if (name) this.venueMap.set(name, venueEntry);
        }

        // 为短缩写建立边界正则，避免 "ton" 匹配到 "proton"
        const abbrNorm = this.normalizeText(venue.abbreviation || '');
        if (abbrNorm && abbrNorm.length <= 12) {
          this.abbrRegexList.push({
            regex: new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(abbrNorm)}([^a-z0-9]|$)`, 'i'),
            venue: venueEntry
          });
        }

        // 建立关键词索引
        if (venue.keywords) {
          for (const keyword of venue.keywords) {
            const keywordNorm = this.normalizeText(keyword);
            if (!keywordNorm) continue;
            if (!this.keywordMap.has(keywordNorm)) {
              this.keywordMap.set(keywordNorm, []);
            }
            this.keywordMap.get(keywordNorm).push(venueEntry);
          }
        }
      }
    }
  }

  /**
   * 匹配期刊/会议
   * @param {string} venueName - 期刊或会议名称
   * @returns {Object|null} 匹配结果
   */
  match(venueName) {
    if (!venueName) return null;

    const normalizedName = this.normalizeText(venueName);
    if (!normalizedName) return null;

    // 1. 精确匹配
    if (this.venueMap.has(normalizedName)) {
      return this.venueMap.get(normalizedName);
    }

    // 2. 缩写边界匹配（防止子串误报）
    for (const item of this.abbrRegexList) {
      if (item.regex.test(normalizedName)) {
        return item.venue;
      }
    }

    // 3. 关键词匹配（按关键词长度优先）
    const keywordEntries = Array.from(this.keywordMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, venues] of keywordEntries) {
      if (normalizedName.includes(keyword)) {
        return venues[0];
      }
    }

    // 4. 模糊包含匹配（仅对较长名字启用，减少误匹配）
    for (const [name, venue] of this.venueMap) {
      if (name.length >= 6 && (normalizedName.includes(name) || name.includes(normalizedName))) {
        return venue;
      }
    }

    return null;
  }

  /**
   * 获取论文质量等级
   * @param {string} venueName - 期刊或会议名称
   * @returns {number} 等级 (1=顶刊顶会, 2=二区, 0=未知)
   */
  getTier(venueName) {
    const match = this.match(venueName);
    return match ? match.tier : 0;
  }

  /**
   * 判断是否为顶刊顶会
   * @param {string} venueName - 期刊或会议名称
   * @returns {boolean}
   */
  isTopVenue(venueName) {
    return this.getTier(venueName) === 1;
  }

  /**
   * 获取完整的venue信息
   * @param {string} venueName - 期刊或会议名称
   * @returns {Object|null}
   */
  getVenueInfo(venueName) {
    const match = this.match(venueName);
    if (!match) return null;

    const tierDef = this.whitelist?.tierDefinitions?.[match.tier.toString()] || {
      label: '未知',
      description: '未定义等级',
      color: '#808080',
      score: 40
    };

    return {
      name: match.name,
      abbreviation: match.abbreviation,
      publisher: match.publisher,
      category: match.category,
      tier: match.tier,
      tierLabel: tierDef.label,
      tierScore: tierDef.score,
      tierColor: tierDef.color,
      isTop: match.tier === 1
    };
  }

  /**
   * 从文本中提取venue名称并匹配
   * @param {string} text - 包含venue信息的文本（如arXiv注释）
   * @returns {Object|null} 匹配结果
   */
  extractAndMatch(text) {
    if (!text) return null;
    
    const normalizedText = text.toLowerCase();
    
    // 尝试直接匹配
    let match = this.match(normalizedText);
    if (match) return { ...match, matchType: 'direct', extractionSource: text };
    
    // 尝试提取常见模式
    // 模式1: "Proc. IEEE INFOCOM 2005" -> "infocom"
    // 模式2: "IEEE International Conference on Computer Communications (INFOCOM)"
    // 模式3: "presented at MobiCom 2024"
    
    const patterns = [
      // 会议缩写提取 (如 INFOCOM, MobiCom, SenSys)
      /\b(sensys|ipsn|infocom|mobisys|mobicom|nsdi|sigcomm|secon|dcoss|ithings|wf-iot|ccs|ndss|oakland|sp|globecom|icc|vtc|percom|ipccc)\b/gi,
      // 期刊缩写提取
      /\b(iot-j|tmc|tpds|ton|tosn|twc|tcom|comst|csur|tii|tsg|compnet|adhoc|jnca|sensors-j|ijdsn|wcmc)\b/gi,
      // 完整名称关键词
      /(internet of things journal|mobile computing|sensor networks|computer communications|networking)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = normalizedText.match(pattern);
      if (matches) {
        for (const m of matches) {
          const venueMatch = this.match(m);
          if (venueMatch) {
            return { 
              ...venueMatch, 
              matchType: 'extracted',
              extractionSource: text,
              extractedVenue: m
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 检查论文是否与研究方向相关
   * @param {string} title - 论文标题
   * @param {string} abstract - 论文摘要
   * @returns {Object} 相关性分析结果
   */
  checkRelevance(title = '', abstract = '') {
    if (!this.whitelist || !this.whitelist.researchKeywords) {
      return { relevant: false, matchedKeywords: [], score: 0 };
    }

    const text = (title + ' ' + abstract).toLowerCase();
    const matchedKeywords = [];
    
    for (const keyword of this.whitelist.researchKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    // 计算相关性分数 (0-1)
    const score = Math.min(matchedKeywords.length / 3, 1);
    
    return {
      relevant: matchedKeywords.length > 0,
      matchedKeywords,
      score,
      isHighlyRelevant: score >= 0.5
    };
  }

  /**
   * 对论文进行完整评估
   * @param {Object} paper - 论文对象
   * @returns {Object} 评估结果
   */
  evaluatePaper(paper) {
    const { title, venue, abstract, authors, comments } = paper;
    
    // 优先从comments/journal-ref中提取venue信息（arXiv常见）
    let venueInfo = null;
    let matchSource = 'venue';
    
    if (comments) {
      const extracted = this.extractAndMatch(comments);
      if (extracted) {
        venueInfo = this.getVenueInfo(extracted.name);
        matchSource = 'comments';
      }
    }
    
    // 如果没有从comments匹配到，使用原始venue
    if (!venueInfo && venue) {
      venueInfo = this.getVenueInfo(venue);
    }
    
    const relevance = this.checkRelevance(title, abstract);
    
    // 综合质量分数 (0-100)
    let qualityScore = 0;
    if (venueInfo) {
      qualityScore += venueInfo.tierScore * 0.5; // venue等级占50%
    }
    qualityScore += relevance.score * 50; // 相关性占50%

    return {
      paper,
      venueInfo,
      relevance,
      qualityScore: Math.round(qualityScore),
      priority: this.calculatePriority(venueInfo, relevance),
      recommendation: this.generateRecommendation(qualityScore, relevance),
      matchSource
    };
  }

  /**
   * 计算论文优先级
   */
  calculatePriority(venueInfo, relevance) {
    if (venueInfo && venueInfo.tier === 1 && relevance.isHighlyRelevant) {
      return 'HIGH';
    } else if ((venueInfo && venueInfo.tier === 1) || relevance.isHighlyRelevant) {
      return 'MEDIUM';
    } else if (venueInfo || relevance.relevant) {
      return 'LOW';
    }
    return 'NONE';
  }

  /**
   * 生成推荐建议
   */
  generateRecommendation(qualityScore, relevance) {
    if (qualityScore >= 80) {
      return '强烈推荐阅读 - 顶刊顶会且高度相关';
    } else if (qualityScore >= 60) {
      return '推荐阅读 - 质量较高或较为相关';
    } else if (qualityScore >= 40) {
      return '可参考 - 有一定价值';
    } else if (relevance.relevant) {
      return '快速浏览 - 仅因关键词匹配';
    }
    return '暂不关注';
  }

  /**
   * 批量评估论文列表
   * @param {Array} papers - 论文列表
   * @returns {Array} 评估后的论文列表（按优先级排序）
   */
  evaluatePapers(papers) {
    const evaluated = papers.map(p => this.evaluatePaper(p));
    
    // 按优先级和质量分数排序
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
    
    return evaluated.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.qualityScore - a.qualityScore;
    });
  }

  /**
   * 获取所有顶刊顶会列表
   * @returns {Array}
   */
  getTopVenues() {
    const topVenues = [];
    if (!this.whitelist || !this.whitelist.categories) return topVenues;

    for (const [categoryKey, category] of Object.entries(this.whitelist.categories)) {
      if (category.tier === 1 && category.venues) {
        topVenues.push(...category.venues.map(v => ({
          ...v,
          category: categoryKey
        })));
      }
    }
    return topVenues;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    if (!this.whitelist || !this.whitelist.categories) return null;

    const stats = {
      totalVenues: 0,
      topTierVenues: 0,
      tier2Venues: 0,
      researchKeywords: this.whitelist.researchKeywords?.length || 0
    };

    for (const category of Object.values(this.whitelist.categories)) {
      if (category.venues) {
        stats.totalVenues += category.venues.length;
        if (category.tier === 1) {
          stats.topTierVenues += category.venues.length;
        } else if (category.tier === 2) {
          stats.tier2Venues += category.venues.length;
        }
      }
    }

    return stats;
  }
}

// 导出单例
module.exports = new VenueMatcher();
