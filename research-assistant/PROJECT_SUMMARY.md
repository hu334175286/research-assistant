# 研究助手 - 项目摘要

## 项目定位
**研究助手** = 智能物联感知与处理领域个人研究门户  
**核心目标**：围绕"智能物联感知与处理"构建个人研究门户，覆盖文献抓取、实验记录、数据集管理、报告生成与模型路由。

---

## 访问地址
- **主地址**：http://localhost:3001
- **本地路径**：`C:\hux_config\research-assistant\research-assistant`
- **技术栈**：Next.js 15.5.12 + Prisma + SQLite

---

## 功能模块（已实现）

### 1. 文献管理 (/papers)
- arXiv 自动抓取
- 顶刊顶会识别（A/B/C 类分级）
- 智能筛选与搜索
- PDF 导出

### 2. 实验记录 (/experiments)
- 实验生命周期管理
- 实验假设、结果记录
- 数据集关联
- 状态工作流（构思中→运行中→已完成）

### 3. 数据集中心 (/datasets)
- 数据集版本管理
- 数据集关联实验
- 拆分记录管理

### 4. 报告系统
- **日报** (/reports/daily)：每日研究进展汇总
- **周报** (/reports/weekly)：每周研究成果总结
- 自动生成与导出

### 5. 研究指挥台 (/dashboard)
- 文献总量统计
- 实验记录统计
- 待办任务统计
- 模型路由状态

### 6. 模型路由 (/api/model-route)
- 4层模型路由配置
- 任务类型智能分配：
  - 代码执行（重构/修错）
  - 文献空白分析
  - 论文筛选与分层
  - 图表/图像理解
  - 日报/周报生成
  - 论文写作与润色
  - 快速迭代任务

### 7. 自动抓取
- 定时从 arXiv 抓取文献
- 按研究方向关键词过滤
- 去重入库
- venue 等级自动识别

---

## 关键配置

### 研究方向配置 (config/research-focus.json)
- 智能物联感知与处理
- 关键词：IoT、sensing、edge computing、wireless sensor 等
- 自动抓取周期：可配置

### 顶刊顶会识别 (config/venue-rules.v2.json)
- **A类**：TMC、SenSys、INFOCOM、MobiCom、NSDI、SIGCOMM 等 21 个
- **B类**：PerCom、ICDCS、ICC、GLOBECOM、IoTDI、EDGE 等 18 个
- **C类**：其他相关期刊会议
- 支持白名单 + 正则匹配双模式

---

## 开发规范

### 每次更新后必做
1. 自动打开研究助手界面（http://localhost:3001）
2. 验证核心功能正常
3. 更新本摘要文档（如有重大变更）

### 汇报格式（整点/半点）
1. 本时段完成
2. 当前阻塞/风险
3. 下个时段计划
4. 可验证访问路径

---

## 启动命令
```bash
cd C:\hux_config\research-assistant\research-assistant
npm run dev
```

---

## 注意事项
- 默认端口 3000，如被占用自动切换到 3001+
- 数据库文件：dev.db（SQLite）
- 环境变量：.env（已配置 DATABASE_URL）

---

**最后更新**：2026-03-11  
**版本**：V1（完整功能版）
