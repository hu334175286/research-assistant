/**
 * 顶刊顶会匹配工具
 * 用于识别论文所属的期刊/会议等级
 */

const fs = require('fs');
const path = require('path');

class VenueMatcher {
  constructor() {
    this.whitelist = null;
    this.venueMap = new Map(); // 用于快速查找
    this.keywordMap = new Map(); // 关键词到venue的映射
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
   * 构建快速查找索引
   */
  buildIndex() {
    if (!this.whitelist || !this.whitelist.categories) return;

    for (const [categoryKey, category] of Object.entries(this.whitelist.categories)) {
      if (!category.venues) continue;
      
      for (const venue of category.venues) {
        // 建立名称索引
        const names = [
          venue.name.toLowerCase(),
          venue.abbreviation.toLowerCase(),
          ...(venue.abbreviation.split('-').map(s => s.toLowerCase()))
        ];
        
        for (const name of names) {
          this.venueMap.set(name, {
            ...venue,
            category: categoryKey,
            tier: category.tier
          });
        }

        // 建立关键词索引
        if (venue.keywords) {
          for (const keyword of venue.keywords) {
            if (!this.keywordMap.has(keyword)) {
              this.keywordMap.set(keyword, []);
            }
            this.keywordMap.get(keyword).push({
              ...venue,
              category: categoryKey,
              tier: category.tier
            });
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

    const normalizedName = venueName.toLowerCase().trim();
    
    // 1. 精确匹配
    if (this.venueMap.has(normalizedName)) {
      return this.venueMap.get(normalizedName);
    }

    // 2. 关键词匹配
    for (const [keyword, venues] of this.keywordMap) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        // 返回最匹配的（关键词最长的优先）
        return venues.sort((a, b) => b.keywords[0].length - a.keywords[0].length)[0];
      }
    }

    // 3. 模糊匹配 - 检查是否包含缩写
    for (const [name, venue] of this.venueMap) {
      if (normalizedName.includes(name) || name.includes(normalizedName)) {
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

    return {
      name: match.name,
      abbreviation: match.abbreviation,
      publisher: match.publisher,
      category: match.category,
      tier: match.tier,
      isTop: match.tier === 1
    };
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
    const { title, venue, abstract, authors } = paper;
    
    const venueInfo = this.getVenueInfo(venue);
    const relevance = this.checkRelevance(title, abstract);
    
    // 综合质量分数 (0-100)
    let qualityScore = 0;
    if (venueInfo) {
      qualityScore += venueInfo.tier === 1 ? 50 : 30;
    }
    qualityScore += relevance.score * 50;

    return {
      paper,
      venueInfo,
      relevance,
      qualityScore: Math.round(qualityScore),
      priority: this.calculatePriority(venueInfo, relevance),
      recommendation: this.generateRecommendation(qualityScore, relevance)
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
