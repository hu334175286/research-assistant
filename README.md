# Research Assistant - 智能物联感知与处理研究门户

## 项目目标
围绕"智能物联感知与处理"构建个人研究门户，自动抓取、筛选和汇报相关领域论文。

## 功能模块

### 1. 顶刊顶会识别模块 ✅ (已完成)
- `config/venue-whitelist.json` - 顶刊顶会白名单
  - **15个顶级期刊 (Tier 1)** - IEEE/ACM Transactions系列
  - **15个顶级会议 (Tier 1)** - SenSys, INFOCOM, MobiCom等
  - **6个二区期刊 (Tier 2)** - IEEE Letters, MDPI Sensors等
  - **5个二区会议 (Tier 2)** - GLOBECOM, ICC, PerCom等
  - **70+ 研究方向关键词** - 覆盖IoT、感知、网络、安全、AI等
- `src/utils/venueMatcher.js` - 期刊会议匹配逻辑
  - 支持从arXiv comments/journal-ref中提取venue信息
  - 关键词匹配和模糊匹配
  - 自动等级评分 (0-100)
  - 相关性分析

### 2. 论文抓取模块 ✅ (已完成)
- `src/fetchers/papers.js` - 论文抓取主逻辑
- 支持 arXiv API
- 自动质量评估和优先级分级 (HIGH/MEDIUM/LOW/NONE)
- 从journal-ref和comments中提取发表venue

### 3. 质量分层与筛选 ✅ (已完成)
- `src/utils/paperFilter.js` - 分层筛选工具
- 支持按等级(Tier)、优先级、关键词、日期等多维度筛选
- 分组统计和可视化报告
- 命令行接口支持多种筛选模式

### 4. 进展汇报模块 ✅ (已完成)
- `src/reporters/progress.js` - 进展汇报生成
- 整点/半点自动汇报
- 文本和Markdown双格式输出
- 统计分析和重点推荐

### 5. 定时调度模块 ✅ (已完成)
- `src/scheduler/index.js` - 定时任务调度
- 支持整点/半点自动抓取和汇报
- 后台服务模式

## 目录结构
```
research-assistant/
├── config/
│   └── venue-whitelist.json    # 顶刊顶会白名单 (41个venue, 70+关键词)
├── src/
│   ├── fetchers/
│   │   └── papers.js           # 论文抓取主逻辑
│   ├── utils/
│   │   ├── venueMatcher.js     # 期刊会议匹配
│   │   └── paperFilter.js      # 质量分层筛选
│   ├── reporters/
│   │   └── progress.js         # 进展汇报生成
│   └── scheduler/
│       └── index.js            # 定时任务调度
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

# 定时调度
npm run scheduler:start   # 启动定时服务
npm run scheduler:once    # 执行一次
npm run scheduler:status  # 查看状态
```

## 顶刊顶会白名单详情

### Tier 1 - 顶级 (15期刊 + 15会议)

**期刊:**
- IEEE Internet of Things Journal (IoT-J)
- IEEE Transactions on Mobile Computing (TMC)
- IEEE Transactions on Parallel and Distributed Systems (TPDS)
- IEEE/ACM Transactions on Networking (ToN)
- ACM Transactions on Sensor Networks (TOSN)
- IEEE Transactions on Wireless Communications (TWC)
- IEEE Transactions on Communications (TCOM)
- IEEE Communications Surveys & Tutorials (COMST)
- ACM Computing Surveys (CSUR)
- IEEE Transactions on Industrial Informatics (TII)
- IEEE Transactions on Smart Grid (TSG)
- Computer Networks (COMNET)
- Ad Hoc Networks (ADHOC)
- Journal of Network and Computer Applications (JNCA)
- IEEE Transactions on Information Forensics and Security (TIFS)

**会议:**
- ACM SenSys, IPSN
- IEEE INFOCOM, SECON, DCOSS, iThings, WF-IoT
- ACM MobiSys, MobiCom, SIGCOMM
- USENIX NSDI, Security
- ACM CCS, NDSS, IEEE S&P

### Tier 2 - 二区 (6期刊 + 5会议)

**期刊:**
- IEEE Internet of Things Magazine
- IEEE Communications Letters
- IEEE Wireless Communications Letters
- Sensors (MDPI)
- International Journal of Distributed Sensor Networks
- Wireless Communications and Mobile Computing

**会议:**
- IEEE GLOBECOM, ICC, VTC
- IEEE PerCom, IPCCC

## 开发状态

- ✅ 顶刊顶会识别模块 (venue-whitelist.json + venueMatcher.js)
- ✅ 论文抓取模块 (papers.js)
- ✅ 质量分层与筛选 (paperFilter.js)
- ✅ 进展汇报模块 (progress.js)
- ✅ 定时调度模块 (scheduler/index.js)
- ✅ 测试脚本 (test-venue-matcher.js)

## 下一步计划

1. 集成更多数据源 (Google Scholar, DBLP)
2. 添加Web界面展示
3. 邮件/消息推送功能
4. 论文PDF自动下载
