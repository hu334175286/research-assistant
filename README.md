# Research Assistant - 智能物联感知与处理研究门户

## 项目目标
围绕"智能物联感知与处理"构建个人研究门户，自动抓取、筛选和汇报相关领域论文。

## 功能模块

### 1. 顶刊顶会识别模块 ✅
- `config/venue-whitelist.json` - 顶刊顶会白名单
- `src/utils/venueMatcher.js` - 期刊会议匹配逻辑

### 2. 论文抓取模块
- `src/fetchers/papers.js` - 论文抓取主逻辑
- 支持 arXiv、Google Scholar 等数据源

### 3. 质量分层与筛选
- 基于顶刊顶会白名单的质量评分
- 可视化筛选界面

### 4. 进展汇报模块
- 整点/半点自动汇报
- 投递状态追踪

## 目录结构
```
research-assistant/
├── config/
│   └── venue-whitelist.json    # 顶刊顶会白名单
├── src/
│   ├── fetchers/
│   │   └── papers.js           # 论文抓取
│   ├── utils/
│   │   └── venueMatcher.js     # 期刊会议匹配
│   └── reporters/
│       └── progress.js         # 进展汇报
├── data/
│   └── papers.json             # 抓取的数据缓存
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
```
