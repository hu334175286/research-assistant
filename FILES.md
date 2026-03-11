# 项目文件清单

## 已创建文件

### 配置文件
- `package.json` - 项目配置和依赖
- `.gitignore` - Git 忽略规则
- `README.md` - 项目说明文档

### 顶刊顶会白名单
- `config/venue-whitelist.json` - 包含：
  - 15个顶级期刊 (IEEE IoT-J, TMC, TPDS, ToN, TOSN, TWC, TCOM 等)
  - 15个顶级会议 (SenSys, IPSN, INFOCOM, MobiSys, MobiCom, NSDI, SIGCOMM 等)
  - 6个二区期刊
  - 5个二区会议
  - 50个研究方向关键词

### 核心模块

#### 1. 期刊会议匹配工具 (`src/utils/venueMatcher.js`)
功能：
- 加载和解析白名单配置
- 期刊/会议名称匹配（精确匹配、关键词匹配、模糊匹配）
- 论文质量等级评估 (tier 1/2/0)
- 研究方向相关性检查
- 论文综合评估（质量分数、优先级、推荐建议）
- 批量论文评估和排序

API：
- `match(venueName)` - 匹配期刊/会议
- `getTier(venueName)` - 获取等级
- `isTopVenue(venueName)` - 是否顶刊顶会
- `checkRelevance(title, abstract)` - 检查相关性
- `evaluatePaper(paper)` - 评估单篇论文
- `evaluatePapers(papers)` - 批量评估
- `getStats()` - 获取统计信息

#### 2. 论文抓取模块 (`src/fetchers/papers.js`)
功能：
- 从 arXiv 抓取论文
- XML 响应解析
- 论文评估和过滤
- 数据持久化（JSON 格式）
- 抓取历史记录
- 增量更新（去重）

API：
- `fetch(options)` - 主抓取流程
- `fetchFromArXiv(options)` - 从 arXiv 抓取
- `getStats()` - 获取统计数据

#### 3. 进展汇报模块 (`src/reporters/progress.js`)
功能：
- 生成进展报告（JSON/Text/Markdown 格式）
- 数据概览统计
- 重点论文推荐
- 详细统计信息
- 最近活动记录
- 报告自动保存

API：
- `generateReport(options)` - 生成报告
- `generateAndSave(options)` - 生成并保存
- `formatAsText(report)` - 格式化为文本
- `formatAsMarkdown(report)` - 格式化为 Markdown

#### 4. 主入口 (`src/index.js`)
功能：
- 系统信息显示
- 命令行接口
- 完整工作流编排

命令：
- `node src/index.js full` - 运行完整工作流（默认）
- `node src/index.js fetch [数量]` - 抓取论文
- `node src/index.js report [数量]` - 生成报告
- `node src/index.js stats` - 显示统计

### 数据目录
- `data/.gitkeep` - 数据目录占位
- `reports/.gitkeep` - 报告目录占位

## 项目结构
```
research-assistant/
├── config/
│   └── venue-whitelist.json    # 顶刊顶会白名单
├── data/
│   └── .gitkeep                # 数据目录
├── reports/
│   └── .gitkeep                # 报告目录
├── src/
│   ├── fetchers/
│   │   └── papers.js           # 论文抓取
│   ├── utils/
│   │   └── venueMatcher.js     # 期刊会议匹配
│   ├── reporters/
│   │   └── progress.js         # 进展汇报
│   └── index.js                # 主入口
├── .gitignore
├── package.json
├── README.md
└── FILES.md                    # 本文件
```

## 后续步骤

1. 安装依赖：
   ```bash
   cd C:\hux_config\research-assistant
   npm install
   ```

2. 初始化 git 仓库：
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 顶刊顶会识别模块 + 论文抓取 + 进展汇报"
   ```

3. 测试运行：
   ```bash
   node src/index.js full
   ```

## 已实现功能

✅ 顶刊顶会白名单配置 (venue-whitelist.json)
✅ 期刊会议匹配逻辑 (venueMatcher.js)
✅ 论文抓取模块 (papers.js) - 支持 arXiv
✅ 质量分层与评估
✅ 进展汇报模块 (progress.js)
✅ 多种格式输出 (Text/Markdown/JSON)

## 待实现功能

⏳ 更多数据源（Google Scholar、IEEE Xplore、ACM DL）
⏳ 定时任务调度（node-cron 集成）
⏳ 可视化筛选界面
⏳ 邮件/消息推送通知
⏳ Web 界面展示
