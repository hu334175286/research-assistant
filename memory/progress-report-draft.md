# 研发进展汇报草稿（内部）

更新时间：2026-03-07 13:30 (Asia/Shanghai)

## 一、当前阶段结论
- 个人研究助手已从基础能力进入“可持续迭代 + 质量分层”阶段。
- 自动抓取、去重入库、前端展示与调度链路已打通，新增了顶会/顶刊质量分层能力。

## 二、本阶段已完成

### 1) 数据与后端能力
- 任务 API 与动态指挥台汇总能力完成。
- 模型路由查询 API 完成。
- arXiv 抓取接口 `/api/papers/arxiv` 完成。
- 自动抓取接口 `/api/papers/auto-fetch` 完成（支持 `?run=1`）。
- 自动抓取去重入库已实现（基于 `title/arxivId`）。
- 调度器支持按配置周期自动抓取。
- 新增顶刊顶会识别与质量摘要 API（venue tiering v1）。

### 2) 前端与可视化
- 首页从骨架态升级为门户化展示。
- 文献页升级为表格视图，并标注 auto 来源。
- 指挥台增加自动抓取统计。
- 新增文献质量分层统计与筛选展示。

### 3) 工程保障
- 增加一键 smoke check 脚本（用于快速回归验证）。
- 已建立整点/半点内部提醒机制，用于持续推进汇报与节奏管理。

## 三、代表性提交（近阶段）
- `35a9dd4` feat(research-assistant): add venue tiering v1 and quality summary API
- `bef6d3b` test: add one-command smoke check script
- `f39b2ca` feat(frontend): 增加文献质量分层统计与筛选展示
- `e82960a` chore: enforce hourly and half-hourly progress heartbeat
- `e783c98` feat: improve auto-fetch control API and papers UI
- `1206da5` feat: add usable auto paper-fetch pipeline and portal UI refresh
- `24bea5f` feat: add tasks API and dynamic dashboard summary

## 四、当前风险与问题
- 定时任务虽已触发，但历史上出现过“触发后未稳定投递用户可见消息”的情况（deliveryStatus: not-requested）。
- 顶刊顶会识别当前为 v1，仍需持续扩充会议/期刊映射表并优化判定策略。

## 五、下一步（可执行）
1. 将整点/半点机制从“内部提醒”升级为“稳定可见推送路径”（补齐显式投递动作与失败重试）。
2. 完善 venue tiering 规则：
   - 扩充白名单与别名；
   - 增加置信度与人工兜底标记；
   - 在 UI 中联动筛选与排序。
3. 把 smoke check 纳入例行流程：
   - 自动抓取链路；
   - 去重逻辑；
   - 指挥台摘要一致性；
   - 前端关键视图可用性。
4. 继续沉淀长期记忆（决策、偏好、路线）到 `MEMORY.md`。

## 六、对外口径（简版）
- 已完成“自动抓取 + 去重入库 + 可视化展示 + 调度运行”的闭环，且上线质量分层基础能力；
- 当前重点从“可用”转向“稳定可见推送 + 质量识别精度 + 自动化回归保障”。
