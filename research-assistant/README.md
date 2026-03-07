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
- 顶刊顶会识别 v1：入库时写入 `venueTier`（A/B/unknown）与 `venueMatchedBy`
- 仪表盘新增：今日自动抓取数 + 最新自动抓取Top5
- 调度器新增：按 `research-focus.json` 的 `fetchEveryMinutes` 自动抓取

## 已实现（D3-任务与看板联动）
- 任务 API：`/api/tasks`
  - `GET /api/tasks?status=todo&take=20`
  - `POST /api/tasks`
  - `PATCH /api/tasks`
- 看板汇总 API：`/api/dashboard-summary`
- Dashboard 改为动态统计：待办任务、近7天文献、近7天实验、本周周报状态

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
