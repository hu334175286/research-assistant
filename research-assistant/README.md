# Personal Research Assistant (V1)

面向个人科研工作者（智能物联感知与处理方向）的网页助手。

## 已实现（D1）
- Next.js 项目骨架
- Prisma + SQLite 数据模型
- 页面：Dashboard / Papers / Experiments / Daily / Weekly
- API：`/api/papers`、`/api/experiments`
- 报告脚本：日报（09:00）/周报（周五12:00）

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
