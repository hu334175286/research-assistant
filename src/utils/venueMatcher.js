/**
 * 顶刊顶会匹配工具
 * 用于识别论文所属的期刊/会议等级
 */

const fs = require('fs');
const path = require('path');

class VenueMatcher {
  constructor() {
    this.whitelist = null;
    this.rules = null;
    this.venueMap = new Map(); // 归一化名称 -> venue
    this.keywordMap = new Map(); // 关键词到venue的映射
    this.keywordMeta = new Map(); // 关键词质量信息
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
      this.rules = this.whitelist?.recognitionRules || {};
      this.buildIndex();
      console.log('[VenueMatcher] 白名单加载成功');
    } catch (error) {
      console.error('[VenueMatcher] 加载白名单失败:', error.message);
      this.whitelist = { categories: {} };
      this.rules = {};
    }
  }

  /**
   * 文本归一化：小写、去标点、压缩空白
   */
  normalizeText(text = '') {
    const normalized = String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[^a-z0-9&+\-\s/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return this.applyCanonicalReplacements(normalized);
  }

  applyCanonicalReplacements(text = '') {
    if (!text) return '';

    const replacements = this.rules?.canonicalReplacements || {};
    let output = text;

    for (const [rawFrom, rawTo] of Object.entries(replacements)) {
      const from = String(rawFrom || '').trim().toLowerCase();
      const to = String(rawTo || '').trim().toLowerCase();
      if (!from || !to) continue;

      const pattern = new RegExp(`(^|\\s)${this.escapeRegExp(from)}(?=\\s|$)`, 'g');
      output = output.replace(pattern, (_, prefix) => `${prefix}${to}`);
    }

    return output.replace(/\s+/g, ' ').trim();
  }

  /**
   * 转义正则特殊字符
   */
  escapeRegExp(text = '') {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 构建快速查找索引
   */
  buildIndex() {
    if (!this.whitelist || !this.whitelist.categories) return;

    this.venueMap.clear();
    this.keywordMap.clear();
    this.keywordMeta.clear();
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
          ...(venue.aliases || [])
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

            if (!this.keywordMeta.has(keywordNorm)) {
              const tokens = keywordNorm.split(/\s+/).filter(Boolean);
              this.keywordMeta.set(keywordNorm, {
                length: keywordNorm.length,
                tokenCount: tokens.length
              });
            }
          }
        }
      }
    }
  }

  stripNoise(text = '') {
    const removable = this.rules?.removePatterns || [];
    let cleaned = this.normalizeText(text);

    for (const pattern of removable) {
      try {
        cleaned = cleaned.replace(new RegExp(pattern, 'gi'), ' ');
      } catch (_) {
        // 忽略非法规则，保证流程可用
      }
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  getReliabilityRules() {
    return {
      minLengthForAmbiguousKeyword: this.rules?.reliability?.minLengthForAmbiguousKeyword ?? 10,
      maxTokenCountForAmbiguousKeyword: this.rules?.reliability?.maxTokenCountForAmbiguousKeyword ?? 2,
      maxLengthForGenericSingleToken: this.rules?.reliability?.maxLengthForGenericSingleToken ?? 5
    };
  }

  getSourceWeights() {
    return this.rules?.sourceWeights || {
      journalRef: 1,
      comments: 0.95,
      venue: 0.9,
      primaryCategory: 0.5
    };
  }

  applyNegativeSignalPenalty(raw = '', detailed = null) {
    if (!raw || !detailed || !detailed.venue) return detailed;

    const cfg = this.rules?.negativeSignals || {};
    const patterns = cfg.patterns || [];
    if (!patterns.length) return detailed;

    const text = this.normalizeText(raw);
    if (!text) return detailed;

    const matchedNegative = patterns.some((pattern) => {
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch (_) {
        return false;
      }
    });

    if (!matchedNegative) return detailed;

    const allowIfExplicitAlias = cfg.allowIfExplicitAlias !== false;
    if (allowIfExplicitAlias && (detailed.matchedBy === 'exact' || detailed.matchedBy === 'abbreviation')) {
      return {
        ...detailed,
        hasNegativeSignal: true,
        negativeSignalSuppressed: true
      };
    }

    const penalty = Number(cfg.penalty ?? 0.25);
    const minConfidence = Number(cfg.minConfidenceAfterPenalty ?? 0.75);
    const confidence = Math.max(0, (detailed.confidence || 0) - penalty);

    if (confidence <= minConfidence) {
      return {
        venue: null,
        matchedBy: 'negative-signal-filtered',
        matchedText: detailed.matchedText,
        confidence,
        filtered: true,
        reason: 'NEGATIVE_CONTEXT'
      };
    }

    return {
      ...detailed,
      confidence,
      hasNegativeSignal: true,
      negativeSignalPenalty: penalty
    };
  }

  isKeywordReliable(keyword = '', mappedVenues = []) {
    const meta = this.keywordMeta.get(keyword) || { length: keyword.length, tokenCount: keyword.split(/\s+/).filter(Boolean).length };
    const genericTokens = new Set(this.rules?.genericTokens || [
      'conference', 'journal', 'ieee', 'acm', 'international', 'symposium', 'transactions', 'proceedings'
    ]);
    const reliability = this.getReliabilityRules();

    // 映射到多个 venue 且关键词过短时，判定不可靠
    if (
      mappedVenues.length > 1
      && meta.length < reliability.minLengthForAmbiguousKeyword
      && meta.tokenCount <= reliability.maxTokenCountForAmbiguousKeyword
    ) {
      return false;
    }

    // 单词关键词过短且过于泛化，容易误报
    if (meta.tokenCount === 1 && meta.length <= reliability.maxLengthForGenericSingleToken && genericTokens.has(keyword)) {
      return false;
    }

    return true;
  }

  /**
   * 为 venue 文本生成多种规则化候选（去年份/冗余前缀）
   */
  buildCandidates(venueName = '') {
    const candidates = [];
    const pushCandidate = (value, transformed = false) => {
      const normalized = this.normalizeText(value);
      if (!normalized) return;
      if (!candidates.some((item) => item.value === normalized)) {
        candidates.push({ value: normalized, transformed });
      }
    };

    pushCandidate(venueName, false);

    let compact = this.stripNoise(venueName);
    pushCandidate(compact, true);

    compact = compact
      .replace(/^\b(proc|proceedings|in proceedings|to appear in|presented at|published in)\b\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    pushCandidate(compact, true);

    // 若存在括号，如 "IEEE S&P (Oakland)"，分别尝试括号内外
    const plain = this.normalizeText(venueName);
    const bracketParts = plain.split(/[()]/).map((s) => s.trim()).filter(Boolean);
    if (bracketParts.length > 1) {
      for (const part of bracketParts) {
        pushCandidate(part, true);
      }
    }

    return candidates;
  }

  /**
   * 详细匹配（包含匹配方式与置信度）
   */
  disambiguateKeywordMatch(candidateValue, venues = []) {
    if (!candidateValue || venues.length <= 1) {
      return venues[0] || null;
    }

    const scored = venues.map((venue) => {
      let score = 0;
      const fields = [venue.name, venue.abbreviation, venue.publisher, ...(venue.aliases || [])]
        .filter(Boolean)
        .map((s) => this.normalizeText(s));

      for (const field of fields) {
        if (!field) continue;
        if (candidateValue.includes(field)) {
          score += Math.min(3, Math.max(1, field.split(/\s+/).length));
        }
      }

      return { venue, score };
    }).sort((a, b) => b.score - a.score);

    if (!scored.length || scored[0].score === 0) return null;
    if (scored.length > 1 && scored[0].score === scored[1].score) return null;
    return scored[0].venue;
  }

  matchDetailed(venueName) {
    if (!venueName) return null;

    const candidates = this.buildCandidates(venueName);
    if (candidates.length === 0) return null;

    const keywordEntries = Array.from(this.keywordMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const candidate of candidates) {
      const confidencePenalty = candidate.transformed ? 0.05 : 0;

      // 1. 精确匹配
      if (this.venueMap.has(candidate.value)) {
        return {
          venue: this.venueMap.get(candidate.value),
          matchedBy: 'exact',
          matchedText: candidate.value,
          confidence: Math.max(0, 1.0 - confidencePenalty)
        };
      }

      // 2. 缩写边界匹配（防止子串误报）
      for (const item of this.abbrRegexList) {
        if (item.regex.test(candidate.value)) {
          return {
            venue: item.venue,
            matchedBy: 'abbreviation',
            matchedText: candidate.value,
            confidence: Math.max(0, 0.95 - confidencePenalty)
          };
        }
      }

      // 3. 关键词匹配（按关键词长度优先）
      for (const [keyword, venues] of keywordEntries) {
        if (!this.isKeywordReliable(keyword, venues)) {
          continue;
        }

        const meta = this.keywordMeta.get(keyword) || { tokenCount: 1 };
        const matched = meta.tokenCount === 1
          ? new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(keyword)}([^a-z0-9]|$)`, 'i').test(candidate.value)
          : candidate.value.includes(keyword);

        if (matched) {
          const selected = this.disambiguateKeywordMatch(candidate.value, venues);
          if (!selected) {
            return {
              venue: null,
              matchedBy: 'keyword-ambiguous',
              matchedText: keyword,
              confidence: Math.max(0, 0.45 - confidencePenalty),
              ambiguous: true,
              candidates: venues.map(v => ({ name: v.name, abbreviation: v.abbreviation, tier: v.tier }))
            };
          }

          return {
            venue: selected,
            matchedBy: 'keyword',
            matchedText: keyword,
            confidence: Math.max(0, 0.85 - confidencePenalty)
          };
        }
      }

      // 4. 模糊包含匹配（仅允许候选包含完整venue名，避免反向子串误报）
      if (candidate.value.length >= 6) {
        for (const [name, venue] of this.venueMap) {
          const tokenCount = name.split(/\s+/).filter(Boolean).length;
          if (name.length >= 6 && tokenCount >= 2 && candidate.value.includes(name)) {
            return {
              venue,
              matchedBy: 'fuzzy',
              matchedText: name,
              confidence: Math.max(0, 0.7 - confidencePenalty)
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 匹配期刊/会议（兼容旧接口）
   */
  match(venueName) {
    const detailed = this.matchDetailed(venueName);
    return detailed ? detailed.venue : null;
  }

  getTier(venueName) {
    const match = this.match(venueName);
    return match ? match.tier : 0;
  }

  isTopVenue(venueName) {
    return this.getTier(venueName) === 1;
  }

  /**
   * 获取完整的venue信息
   */
  getVenueInfo(venueName) {
    const detailed = this.matchDetailed(venueName);
    if (!detailed || !detailed.venue) return null;

    const match = detailed.venue;
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
      isTop: match.tier === 1,
      matchConfidence: detailed.confidence,
      matchedBy: detailed.matchedBy,
      matchedText: detailed.matchedText
    };
  }

  /**
   * 从文本中提取venue名称并匹配
   */
  extractAndMatch(text) {
    if (!text) return null;

    const normalizedText = this.stripNoise(text);

    // 1) 整体直接匹配
    const directRaw = this.matchDetailed(normalizedText);
    const direct = this.applyNegativeSignalPenalty(text, directRaw);
    if (direct && direct.venue) {
      return {
        ...direct.venue,
        matchType: direct.matchedBy,
        baseMatchType: direct.matchedBy,
        extractionMode: 'direct',
        matchedBy: direct.matchedBy,
        extractionSource: text,
        extractedVenue: direct.matchedText,
        confidence: direct.confidence
      };
    }

    // 2) 按边界切分并尝试短语匹配（规则化，不写死具体会议名）
    const tokenPattern = this.rules?.tokenSplitRegex || '[^a-z0-9&+\\-/]+';
    let tokens = [];
    try {
      tokens = normalizedText
        .split(new RegExp(tokenPattern, 'g'))
        .map((t) => t.trim())
        .filter(Boolean);
    } catch (_) {
      tokens = normalizedText
        .split(/[^a-z0-9&+\-/]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const maxN = Math.min(this.rules?.maxNgram || 8, tokens.length);
    for (let n = maxN; n >= 1; n--) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const phrase = tokens.slice(i, i + n).join(' ');
        const venueMatchRaw = this.matchDetailed(phrase);
        const venueMatch = this.applyNegativeSignalPenalty(text, venueMatchRaw);
        if (venueMatch?.venue) {
          const baseMatchType = venueMatch.matchedBy || (n >= 3 ? 'phrase' : 'token');
          const extractionPenalty = baseMatchType === 'exact' || baseMatchType === 'abbreviation'
            ? 0
            : baseMatchType === 'keyword'
              ? 0.03
              : 0.05;

          return {
            ...venueMatch.venue,
            matchType: baseMatchType,
            baseMatchType,
            extractionMode: n >= 3 ? 'phrase' : 'token',
            matchedBy: baseMatchType,
            extractionSource: text,
            extractedVenue: phrase,
            confidence: Math.max(0, venueMatch.confidence - extractionPenalty)
          };
        }
      }
    }

    return null;
  }

  /**
   * 对多来源venue文本进行统一识别，返回最佳命中结果与证据
   */
  classifyVenue(candidateSources = []) {
    const ranked = [];
    const reasonCodes = [];

    for (const source of candidateSources) {
      const raw = source?.text;
      if (!raw) continue;

      const sourceName = source.name || 'unknown';
      const sourceWeight = source.weight || 1;
      const rawDetailed = this.applyNegativeSignalPenalty(raw, this.matchDetailed(raw));

      if (rawDetailed?.ambiguous) {
        reasonCodes.push(`AMBIGUOUS_KEYWORD:${sourceName}`);
      }
      if (rawDetailed?.filtered) {
        reasonCodes.push(`NEGATIVE_CONTEXT:${sourceName}`);
      }

      const extracted = this.extractAndMatch(raw);
      if (!extracted) {
        reasonCodes.push(`NO_VENUE_SIGNAL:${sourceName}`);
        continue;
      }

      const venueInfo = this.getVenueInfo(extracted.name);
      if (!venueInfo) {
        reasonCodes.push(`LOW_CONFIDENCE:${sourceName}`);
        continue;
      }

      const weightedScore = (extracted.confidence || 0) * sourceWeight;

      const detailMatchType = extracted.baseMatchType || extracted.matchedBy || extracted.matchType;

      ranked.push({
        source: sourceName,
        raw,
        extractedVenue: extracted.extractedVenue || extracted.abbreviation || extracted.name,
        matchType: detailMatchType || 'unknown',
        extractionMode: extracted.extractionMode || 'direct',
        confidence: extracted.confidence || 0,
        weightedScore,
        venueInfo
      });

      const matchReason = detailMatchType === 'exact'
        ? 'EXACT_MATCH'
        : detailMatchType === 'abbreviation'
          ? 'ABBR_MATCH'
          : detailMatchType === 'keyword'
            ? 'KEYWORD_MATCH'
            : 'TEXT_MATCH';
      reasonCodes.push(`${matchReason}:${sourceName}`);
    }

    ranked.sort((a, b) => {
      if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
      if ((b.venueInfo?.tier || 0) !== (a.venueInfo?.tier || 0)) {
        // Tier 数值越小等级越高：1(顶级) > 2(二区) > 0(未知)
        const rank = (tier) => {
          if (tier === 1) return 3;
          if (tier === 2) return 2;
          if (tier === 3) return 1;
          return 0;
        };
        return rank(b.venueInfo?.tier || 0) - rank(a.venueInfo?.tier || 0);
      }
      return (b.confidence || 0) - (a.confidence || 0);
    });

    const best = ranked[0] || null;

    return {
      matched: !!best,
      best,
      candidates: ranked,
      reasonCodes: [...new Set(reasonCodes)],
      venueInfo: best?.venueInfo || null,
      venueEvidence: best
        ? {
            source: best.source,
            raw: best.raw,
            extractedVenue: best.extractedVenue,
            matchType: best.matchType,
            extractionMode: best.extractionMode,
            confidence: best.confidence
          }
        : null,
      isTopVenue: best?.venueInfo?.tier === 1,
      tier: best?.venueInfo?.tier || 0
    };
  }

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

    const score = Math.min(matchedKeywords.length / 3, 1);

    return {
      relevant: matchedKeywords.length > 0,
      matchedKeywords,
      score,
      isHighlyRelevant: score >= 0.5
    };
  }

  evaluatePaper(paper) {
    const { title, venue, abstract, comments, journalRef } = paper;

    let venueInfo = null;
    let matchSource = 'venue';

    // 优先使用更结构化的 journalRef，其次 comments，再回退 venue 字段
    if (journalRef) {
      const extracted = this.extractAndMatch(journalRef);
      if (extracted) {
        venueInfo = this.getVenueInfo(extracted.name);
        matchSource = 'journalRef';
      }
    }

    if (!venueInfo && comments) {
      const extracted = this.extractAndMatch(comments);
      if (extracted) {
        venueInfo = this.getVenueInfo(extracted.name);
        matchSource = 'comments';
      }
    }

    if (!venueInfo && venue) {
      venueInfo = this.getVenueInfo(venue);
    }

    const relevance = this.checkRelevance(title, abstract);

    let qualityScore = 0;
    if (venueInfo) {
      const confidenceWeight = venueInfo.matchConfidence >= 0.9
        ? 1
        : venueInfo.matchConfidence >= 0.8
          ? 0.9
          : 0.75;
      qualityScore += venueInfo.tierScore * 0.5 * confidenceWeight;
    }
    qualityScore += relevance.score * 50;

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

  generateRecommendation(qualityScore, relevance) {
    if (qualityScore >= 80) return '强烈推荐阅读 - 顶刊顶会且高度相关';
    if (qualityScore >= 60) return '推荐阅读 - 质量较高或较为相关';
    if (qualityScore >= 40) return '可参考 - 有一定价值';
    if (relevance.relevant) return '快速浏览 - 仅因关键词匹配';
    return '暂不关注';
  }

  evaluatePapers(papers) {
    const evaluated = papers.map(p => this.evaluatePaper(p));
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };

    return evaluated.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.qualityScore - a.qualityScore;
    });
  }

  getTopVenues() {
    const topVenues = [];
    if (!this.whitelist || !this.whitelist.categories) return topVenues;

    for (const [categoryKey, category] of Object.entries(this.whitelist.categories)) {
      if (category.tier === 1 && category.venues) {
        topVenues.push(...category.venues.map(v => ({ ...v, category: categoryKey })));
      }
    }
    return topVenues;
  }

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

  getWhitelistVersion() {
    return this.whitelist?.version || 'unknown';
  }

  getMatcherMetadata() {
    const stats = this.getStats() || {
      totalVenues: 0,
      topTierVenues: 0,
      tier2Venues: 0,
      researchKeywords: 0
    };

    return {
      whitelistVersion: this.getWhitelistVersion(),
      totalVenues: stats.totalVenues,
      topTierVenues: stats.topTierVenues,
      tier2Venues: stats.tier2Venues,
      keywordIndexSize: this.keywordMap.size,
      canonicalNameIndexSize: this.venueMap.size,
      abbreviationRegexSize: this.abbrRegexList.length
    };
  }
}

module.exports = new VenueMatcher();
