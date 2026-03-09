# Research Assistant — Compact Handoff (for new session)

## 0) Goal
Build a personal research portal for 智能物联感知与处理: papers ingestion, experiment tracking, reports, model routing.

## 1) Current baseline (already available)
- Pages/APIs run: `dashboard / papers / experiments / reports`
- Model routing baseline wired
- arXiv fetch + auto-fetch pipeline wired
- Basic quality/tiering related APIs/UI already exist

## 2) Priority TODO (P0->P2)
- **P0** Reliable visible progress delivery at `:00/:30` (must be user-visible + verifiable)
- **P1** Venue tiering v2: whitelist + regex configurable rules (backward-compatible)
- **P2** Quality stratification UX: stronger filters/visuals (tier/source/time), no regression

## 3) Collaboration protocol (hard requirement)
At each `:00/:30`, report with fixed 4 blocks:
1) 本时段完成
2) 当前阻塞/风险
3) 下个半小时计划
4) 可验证访问路径

Before opening UI each time, ask user first; only execute after explicit “打开页面”.
Open command: in `research-assistant`, run `npm run quick:open`.
Expected URL priority: `http://localhost:3000` then `3124/3125`.

## 4) Quick verify commands
```bash
npm run build
npm run smoke
npm run papers:auto-fetch
```

## 5) Known risk
Parallel subagent runs timed out in previous round; use smaller scoped tasks + short commits + immediate local verification.

## 6) Suggested next 90-min execution plan
- 0-30m: implement venue rule config structure + parser compatibility guard
- 30-60m: add/update papers filters (source/time/tier), keep old query params valid
- 60-90m: improve reporting chain observability + one-command status check, then smoke
