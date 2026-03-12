# Git 提交说明

## 本次提交内容

```bash
# 添加所有变更
git add .

# 提交变更
git commit -m "feat: 完善顶刊顶会识别模块 - 添加41个venue和70+关键词

- 扩展 venue-whitelist.json:
  * 15个顶级期刊 (Tier 1): IoT-J, TMC, TPDS, ToN, TOSN等
  * 15个顶级会议 (Tier 1): SenSys, INFOCOM, MobiCom, SIGCOMM等
  * 6个二区期刊 (Tier 2): IoT-Mag, Sensors, IJDSN等
  * 5个二区会议 (Tier 2): GLOBECOM, ICC, PerCom等
  * 70+ 研究方向关键词

- 新增配置验证脚本 scripts/validate-config.js
- 更新 README.md 和完善文档
- 添加 .gitignore 和目录保持文件
- 更新 package.json 添加 validate:config 脚本

所有核心模块已就绪:
- venueMatcher.js: 期刊会议匹配逻辑
- papers.js: 论文抓取主逻辑
- paperFilter.js: 质量分层筛选
- progress.js: 进展汇报生成
- scheduler/index.js: 定时任务调度"

# 推送到远程
git push origin main
```

## 提交前检查清单

- [x] venue-whitelist.json 包含41个venue
- [x] 15个顶级期刊已添加
- [x] 15个顶级会议已添加
- [x] 6个二区期刊已添加
- [x] 5个二区会议已添加
- [x] 70+ 研究方向关键词已添加
- [x] README.md 已更新
- [x] package.json 已更新
- [x] .gitignore 已添加
- [x] DEVLOG.md 已创建
