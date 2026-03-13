/**
 * 验证 venue-whitelist.json 配置完整性与规则一致性
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/venue-whitelist.json');

const normalize = (text = '') => String(text)
  .toLowerCase()
  .replace(/[^a-z0-9&+\-/\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║     🔍 venue-whitelist.json 配置验证                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

try {
  const data = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(data);

  // 1. 验证基本结构
  console.log('✅ JSON 格式正确');
  console.log(`   版本: ${config.version}`);
  console.log(`   描述: ${config.description}`);
  console.log();

  // 2. 验证等级定义
  console.log('📊 等级定义:');
  for (const [tier, def] of Object.entries(config.tierDefinitions || {})) {
    console.log(`   Tier ${tier}: ${def.label} (${def.score}分) - ${def.description}`);
  }
  console.log();

  // 3. 统计各类别
  console.log('📚 期刊/会议统计:');
  let totalVenues = 0;
  let topTierCount = 0;
  let tier2Count = 0;

  for (const [categoryKey, category] of Object.entries(config.categories || {})) {
    const count = category.venues ? category.venues.length : 0;
    totalVenues += count;

    if (category.tier === 1) {
      topTierCount += count;
    } else if (category.tier === 2) {
      tier2Count += count;
    }

    console.log(`   ${category.name} (${categoryKey}): ${count} 个 (Tier ${category.tier})`);

    if (category.venues && category.venues.length > 0) {
      for (let i = 0; i < Math.min(3, category.venues.length); i++) {
        const v = category.venues[i];
        console.log(`      - ${v.abbreviation}: ${v.name}`);
      }
      if (category.venues.length > 3) {
        console.log(`      ... 还有 ${category.venues.length - 3} 个`);
      }
    }
  }
  console.log();

  // 4. 验证关键词
  const keywordCount = (config.researchKeywords || []).length;
  console.log(`🔑 研究方向关键词: ${keywordCount} 个`);
  if (keywordCount > 0) {
    console.log(`   示例: ${(config.researchKeywords || []).slice(0, 5).join(', ')}...`);
  }
  console.log();

  // 5. venue 结构验证 + 冲突检测
  console.log('🔍 验证每个venue结构与命名冲突...');
  const errors = [];
  const warnings = [];

  const abbrIndex = new Map();
  const nameIndex = new Map();
  const keywordIndex = new Map();

  for (const [categoryKey, category] of Object.entries(config.categories || {})) {
    if (!category.venues) continue;

    for (const venue of category.venues) {
      if (!venue.name) errors.push(`${categoryKey}: 缺少name`);
      if (!venue.abbreviation) errors.push(`${categoryKey}/${venue.name}: 缺少abbreviation`);
      if (!venue.publisher) errors.push(`${categoryKey}/${venue.name}: 缺少publisher`);
      if (!venue.keywords || venue.keywords.length === 0) {
        errors.push(`${categoryKey}/${venue.name}: 缺少keywords`);
      }

      const abbr = normalize(venue.abbreviation || '');
      const name = normalize(venue.name || '');

      if (abbr) {
        if (!abbrIndex.has(abbr)) abbrIndex.set(abbr, []);
        abbrIndex.get(abbr).push(`${categoryKey}/${venue.name}`);
      }

      if (name) {
        if (!nameIndex.has(name)) nameIndex.set(name, []);
        nameIndex.get(name).push(`${categoryKey}/${venue.name}`);
      }

      for (const kw of (venue.keywords || [])) {
        const keyword = normalize(kw);
        if (!keyword) continue;
        if (!keywordIndex.has(keyword)) keywordIndex.set(keyword, new Set());
        keywordIndex.get(keyword).add(`${categoryKey}/${venue.name}`);
      }
    }
  }

  for (const [abbr, refs] of abbrIndex.entries()) {
    if (refs.length > 1) {
      errors.push(`缩写冲突 "${abbr}": ${refs.join(' | ')}`);
    }
  }

  for (const [name, refs] of nameIndex.entries()) {
    if (refs.length > 1) {
      errors.push(`名称冲突 "${name}": ${refs.join(' | ')}`);
    }
  }

  for (const [kw, refs] of keywordIndex.entries()) {
    if (refs.size <= 1) continue;
    const refList = [...refs];
    if (kw.length <= 5 || kw.split(/\s+/).length <= 1) {
      warnings.push(`高歧义短关键词 "${kw}": ${refList.join(' | ')}`);
    }
  }

  // 6. 规则字段健康度
  const rules = config.recognitionRules || {};
  if (!Array.isArray(rules.removePatterns) || rules.removePatterns.length === 0) {
    warnings.push('recognitionRules.removePatterns 为空，噪声清洗可能不足');
  }
  if (!rules.canonicalReplacements || Object.keys(rules.canonicalReplacements).length === 0) {
    warnings.push('recognitionRules.canonicalReplacements 为空，规则化能力偏弱');
  }

  if (errors.length > 0) {
    console.log('❌ 发现错误:');
    errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log('✅ 所有venue结构正确，未发现硬冲突');
  }

  if (warnings.length > 0) {
    console.log('⚠️ 风险提示:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }
  console.log();

  // 7. 汇总
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 配置汇总:');
  console.log(`   总期刊/会议数: ${totalVenues}`);
  console.log(`   - 顶级 (Tier 1): ${topTierCount} 个`);
  console.log(`   - 二区 (Tier 2): ${tier2Count} 个`);
  console.log(`   研究方向关键词: ${keywordCount} 个`);
  console.log(`   硬错误: ${errors.length} | 风险提示: ${warnings.length}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  if (errors.length === 0 && totalVenues >= 40 && topTierCount >= 30 && keywordCount >= 60) {
    console.log('✅ 配置验证通过！');
  } else if (errors.length === 0) {
    console.log('⚠️ 配置可用，但覆盖度可能不完整');
  } else {
    console.log('❌ 配置验证失败，请修复后再使用');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ 验证失败:', error.message);
  process.exit(1);
}
