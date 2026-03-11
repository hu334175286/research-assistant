# Research Assistant - 智能物联感知与处理研究门户

## 项目目标
围绕"智能物联感知与处理"构建个人研究门户，自动抓取、筛选和汇报相关领域论文。

## 功能模块

### 1. 顶刊顶会识别模块 ✅
- `config/venue-whitelist.json` - 顶刊顶会白名单
  - 15个顶级期刊 (Tier 1)
  - 15个顶级会议 (Tier 1)
  - 6个二区期刊 (Tier 2)
  - 5个二区会议 (Tier 2)
  - 60+ 研究方向关键词
- `src/utils/venueMatcher.js` - 期刊会议匹配逻辑
  - 支持从arXiv comments中提取venue信息
  - 关键词匹配和模糊匹配
  - 自动等级评分 (0-100)

### 2. 论文抓取模块
- `src/fetchers/papers.js` - 论文抓取主逻辑
- 支持 arXiv API
- 自动质量评估和优先级分级

### 3. 质量分层与筛选 ✅
- `src/utils/paperFilter.js` - 分层筛选工具
- 支持按等级、优先级、关键词、日期等多维度筛选
- 分组统计和可视化报告

### 4. 进展汇报模块
- `src/reporters/progress.js` - 进展汇报生成
- 整点/半点自动汇报
- 文本和Markdown双格式输出

## 目录结构
```
research-assistant/
├── config/
│   └── venue-whitelist.json    # 顶刊顶会白名单 (41个venue, 60+关键词)
├── src/
│   ├── fetchers/
│   │   └── papers.js           # 论文抓取主逻辑
│   ├── utils/
│   │   ├── venueMatcher.js     # 期刊会议匹配 (支持提取和模糊匹配)
│   │   └── paperFilter.js      # 质量分层筛选工具
│   └── reporters/
│       └── progress.js         # 进展汇报生成
├── scripts/
│   └── test-venue-matcher.js   # 模块测试脚本
├── data/
│   └── papers.json             # 抓取的数据缓存
├── reports/                    # 生成的报告
└── package.json
```

## 使用说明

```bash
# 安装依赖
npm install

# 抓取论文
npm run fetch

# 生成进展报告
npm run report

# 测试顶刊顶会识别模块
npm run test:venue

# 筛选论文（多种模式）
npm run filter           # 全部论文
npm run filter:top       # 仅顶刊顶会
npm run filter:high      # 仅高优先级
```
