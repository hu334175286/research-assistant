/**
 * 顶刊顶会白名单质量检查
 * - 必填字段校验
 * - 重复名称/缩写冲突检测
 * - tier 与分类完整性检查
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/venue-whitelist.json');

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9&+\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);

  const categories = cfg.categories || {};
  const tierDefs = cfg.tierDefinitions || {};

  const errors = [];
  const warnings = [];

  const keyOwners = new Map(); // normalized key -> [{category, venueName, field}]
  const tierStats = {};
  let totalVenues = 0;

  for (const [categoryKey, category] of Object.entries(categories)) {
    const tier = category?.tier;
    const venues = category?.venues || [];

    if (!tierDefs[String(tier)]) {
      errors.push(`分类 ${categoryKey} 的 tier=${tier} 未在 tierDefinitions 中定义`);
    }

    tierStats[tier] = (tierStats[tier] || 0) + venues.length;

    for (const venue of venues) {
      totalVenues += 1;
      const name = venue?.name;
      const abbr = venue?.abbreviation;
      const keywords = venue?.keywords;

      if (!name || !abbr) {
        errors.push(`分类 ${categoryKey} 存在缺少 name/abbreviation 的 venue: ${JSON.stringify(venue)}`);
        continue;
      }

      if (!Array.isArray(keywords) || keywords.length === 0) {
        warnings.push(`venue ${name}(${abbr}) 未配置 keywords`);
      }

      const keys = [
        { value: name, field: 'name' },
        { value: abbr, field: 'abbreviation' },
        ...((venue.aliases || []).map((v) => ({ value: v, field: 'alias' })))
      ];

      for (const item of keys) {
        const key = normalize(item.value);
        if (!key) continue;
        const owners = keyOwners.get(key) || [];
        owners.push({
          category: categoryKey,
          venueName: name,
          abbreviation: abbr,
          field: item.field
        });
        keyOwners.set(key, owners);
      }
    }
  }

  // 冲突检测：同一标准化key归属不同venue
  for (const [key, owners] of keyOwners.entries()) {
    const venueSet = new Set(owners.map((o) => `${o.venueName}::${o.abbreviation}`));
    if (venueSet.size > 1) {
      warnings.push(
        `标准化名称冲突 "${key}": ${owners.map((o) => `${o.venueName}(${o.abbreviation})[${o.field}]`).join(' | ')}`
      );
    }
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         ✅ 顶刊顶会白名单质量检查                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`版本: ${cfg.version || 'unknown'}`);
  console.log(`总 venue 数: ${totalVenues}`);
  console.log(`Tier 分布: ${Object.entries(tierStats).map(([k, v]) => `tier${k}=${v}`).join(', ') || '无'}`);
  console.log(`分类数: ${Object.keys(categories).length}`);
  console.log('');

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 20) {
      console.log(`  ... 其余 ${warnings.length - 20} 条已省略`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  }

  console.log('🎉 检查通过（无阻断错误）');
}

main();
