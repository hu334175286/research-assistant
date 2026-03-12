# 项目结构

```
research-assistant/
├── config/                          # 配置文件
│   └── venue-whitelist.json         # 顶刊顶会白名单 (41个venue, 70+关键词)
│
├── src/                             # 源代码
│   ├── index.js                     # 主入口
│   ├── fetchers/
│   │   └── papers.js                # 论文抓取模块 (arXiv API)
│   ├── utils/
│   │   ├── venueMatcher.js          # 期刊会议匹配工具
│   │   └── paperFilter.js           # 论文筛选工具
│   ├── reporters/
│   │   └── progress.js              # 进展汇报生成器
│   └── scheduler/
│       └── index.js                 # 定时任务调度器
│
├── scripts/                         # 工具脚本
│   ├── test-venue-matcher.js        # venue匹配测试
│   └── validate-config.js           # 配置验证工具
│
├── data/                            # 数据目录 (gitignored)
│   ├── .gitkeep
│   ├── papers.json                  # 论文数据缓存
│   └── fetch-history.json           # 抓取历史
│
├── reports/                         # 报告目录 (gitignored)
│   ├── .gitkeep
│   └── report-YYYY-MM-DD-HHMM.*     # 生成的报告
│
├── package.json                     # 项目配置
├── README.md                        # 项目说明
├── DEVLOG.md                        # 开发日志
├── COMMIT.md                        # 提交说明
└── .gitignore                       # Git忽略配置

```

## 模块依赖关系

```
index.js (主入口)
  ├── PaperFetcher (fetchers/papers.js)
  │     └── venueMatcher (utils/venueMatcher.js)
  │           └── venue-whitelist.json
  ├── ProgressReporter (reporters/progress.js)
  │     └── venueMatcher
  └── TaskScheduler (scheduler/index.js)
        ├── PaperFetcher
        └── ProgressReporter

paperFilter.js (独立工具)
  └── venueMatcher
```

## 数据流

```
arXiv API
    ↓
papers.js (抓取)
    ↓
venueMatcher.js (评估)
    - 提取venue信息
    - 计算质量分数
    - 确定优先级
    ↓
papers.json (存储)
    ↓
progress.js / paperFilter.js (报告/筛选)
    ↓
reports/ (输出)
```
