# 提交说明 - 顶刊顶会识别模块增强

## 本次更新内容

### 1. 顶刊顶会白名单增强 (config/venue-whitelist.json)
- 添加版本号 (v1.1.0) 和更新日期
- 新增等级定义 (tierDefinitions)，包含标签、描述、颜色和分数
- 白名单包含:
  - 15个顶级期刊 (Tier 1)
  - 15个顶级会议 (Tier 1)
  - 6个二区期刊 (Tier 2)
  - 5个二区会议 (Tier 2)
  - 60+ 研究方向关键词

### 2. Venue匹配器增强 (src/utils/venueMatcher.js)
- 新增 `extractAndMatch()` 方法，支持从arXiv comments中提取venue信息
- 增强 `getVenueInfo()` 返回完整的等级信息 (tierLabel, tierScore, tierColor)
- 改进 `evaluatePaper()` 优先从comments匹配venue
- 支持多种匹配模式: 直接匹配、关键词匹配、模糊匹配、文本提取

### 3. 论文抓取模块优化 (src/fetchers/papers.js)
- 增强 `evaluateAndFilter()` 添加详细统计输出
- 新增等级分布和优先级分布统计
- 支持 `includeArXivOnly` 选项保留高相关性arXiv论文

### 4. 进展汇报模块增强 (src/reporters/progress.js)
- 报告新增venue等级标签和分数
- 新增按等级统计 (byTier)
- 新增Venue分布详情 (venueDistribution)
- 增强文本报告格式，显示等级分布

### 5. 新增论文筛选工具 (src/utils/paperFilter.js)
- 支持多维度筛选: 等级、优先级、关键词、日期、来源、venue
- 分组统计功能 (按等级、优先级、venue、来源、月份)
- 生成可视化筛选报告
- 命令行接口支持多种筛选模式

### 6. 新增测试脚本 (scripts/test-venue-matcher.js)
- 白名单统计测试
- Venue匹配测试 (8个测试用例)
- 文本提取测试 (5个测试用例)
- 相关性检查测试
- 论文评估测试
- 顶刊顶会列表展示

### 7. 项目配置更新
- package.json 新增脚本命令:
  - `test:venue` - 运行venue匹配器测试
  - `filter` - 运行筛选工具
  - `filter:top` - 仅筛选顶刊顶会
  - `filter:high` - 仅筛选高优先级
- README.md 更新文档，反映新增功能
- 创建 scripts/.gitkeep 和 reports/.gitkeep

## 测试验证
运行 `npm run test:venue` 可验证顶刊顶会识别模块功能

## 后续计划
1. 抓取质量分层与可视化筛选 (进行中)
2. 整点/半点进展汇报稳定可见投递
