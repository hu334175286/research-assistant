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
- 自动抓取API：`/api/papers/auto-fetch`
- 抓取源：arXiv（按研究方向关键词 + 类别过滤 + 去重入库）
- 仪表盘新增：今日自动抓取数 + 最新自动抓取Top5
- 调度器新增：每30分钟自动抓取一次

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
