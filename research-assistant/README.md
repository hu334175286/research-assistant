# Personal Research Assistant (V1)

面向个人科研工作者（智能物联感知与处理方向）的网页助手。

## 已实现（D1）
- Next.js 项目骨架
- Prisma + SQLite 数据模型
- 页面：Dashboard / Papers / Experiments / Daily / Weekly
- API：`/api/papers`、`/api/experiments`
- 报告脚本：日报（09:00）/周报（周五12:00）

## 已实现（D2-路由基线）
- 4层模型路由配置：`config/model-router.json`
- 路由加载器：`lib/model-router.js`
- 查询API：`/api/model-route?taskType=...`
  - `code_execution`
  - `literature_gap`
  - `daily_weekly`
  - `paper_writing`

## 已实现（D3-可用优先自动抓取链路）
- 研究方向配置：`config/research-focus.json`
- 自动抓取脚本：`npm run papers:auto-fetch`
- 自动抓取API：`/api/papers/auto-fetch`（状态） / `?run=1`（立即执行）
- 质量汇总API：`/api/papers/quality-summary`
- 抓取源：arXiv（按研究方向关键词 + 类别过滤 + 去重入库）
- 顶刊顶会识别 v2：支持 `config/venue-rules.v2.json` 可配置规则（白名单 + regex），并保持入库字段 `venueTier`（A/B/unknown）与 `venueMatchedBy` 兼容
- 仪表盘新增：今日自动抓取数 + 最新自动抓取Top5
- 调度器新增：按 `research-focus.json` 的 `fetchEveryMinutes` 自动抓取

## 已实现（D3-任务与看板联动）
- 任务 API：`/api/tasks`
  - `GET /api/tasks?status=todo&take=20`
  - `POST /api/tasks`
  - `PATCH /api/tasks`
- 看板汇总 API：`/api/dashboard-summary`
- Dashboard 改为动态统计：待办任务、近7天文献、近7天实验、本周周报状态

## 已实现（D4-实验库筛选与检索）
- 页面：`/experiments`
- 新增前端可交互能力（不改动数据库结构）：
  - 关键词检索（名称 / 假设 / 结论 / 数据集名称 / 数据集版本快照）
  - 按数据集筛选（全部 / 未关联 / 指定数据集）
  - 实时显示「总条数 vs 当前命中条数」
- 适配当前 `Experiment` + `Dataset` 结构，无需迁移

## 已实现（D5-日报筛选与状态标注）
- 页面：`/reports/daily`
- 新增可交付能力（不改动数据库结构）：
  - 关键词检索（`dayKey` / `contentShort` / `contentFull`）
  - 状态筛选：全部 / 完整 / 缺摘要 / 缺全文
  - 列表状态标注 + 命中数统计（总数 vs 当前筛选）
- 适配当前 `DailyReport` 字段（`dayKey`、`contentShort`、`contentFull`），无需迁移

## 本地启动
```bash
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## 定时任务（可选）
```bash
npm run scheduler
```

## 自动化开发巡检（推荐）
```bash
npm run auto:cycle
```

输出报告：`reports/automation/latest.md`（包含 build / smoke / auto-fetch 结果）

## 已知问题与修复（简短）
- 症状：`next build` 在混合 `app/` + `pages/` 场景报错 `Cannot find module for page: /_document`。
- 根因：启用了 Pages Router（存在 `pages/_app.js`）但缺少（或被误删）`pages/_document.js` 时，构建阶段无法解析 `/_document`。
- 最小修复：保留一个最小实现的 `pages/_document.js`（仅 `Html/Head/Main/NextScript`），不影响现有 App Router 页面。

## 顶刊顶会识别规则 v2（使用方法）
- 配置文件：`config/venue-rules.v2.json`
  - `venue.whitelist` / `ccf.whitelist`：按会刊与等级精确短语匹配
  - `venue.regex` / `ccf.regex`：按正则匹配，支持 `tier/pattern/flags/matchedBy`
- 匹配优先级：`whitelist > regex > 现有 venues 列表回退`
- 字段兼容：输出仍为 `venueTier` 与 `venueMatchedBy`（CCF 为 `ccfTier` 与 `ccfMatchedBy`）
- 最小验证：`npm run check:venue-rules`

## Papers API 筛选参数（向后兼容）
`GET /api/papers` 默认仍返回最近 50 条（与旧行为一致）。
`/papers` 页面已改为调用该 API（`includeMeta=1`）完成筛选，避免在前端页面内存里全量过滤。

可选查询参数（新）：
- `quality`: `all | high | medium | low`
- `ccfTier`（或 `ccf`）: `all | A | B | C | NA`
- `source`（或 `src`）: 来源字符串（如 `arXiv:auto`）
- `yearFrom` / `yearTo`（兼容 `fromYear/startYear` 与 `toYear/endYear`）
- `take`（或 `limit`）: 返回条数上限（最大 500）
- `includeMeta=1`: 返回 `{ items, meta }` 结构（包含 sourceOptions 等）

示例：
```bash
# 过滤 2023+ 的高质量 CCF-A 论文，并返回元信息
curl "http://127.0.0.1:3000/api/papers?quality=high&ccfTier=A&yearFrom=2023&includeMeta=1"

# 按来源筛选，兼容旧参数名 src/limit
curl "http://127.0.0.1:3000/api/papers?src=arXiv:auto&limit=100"
```
