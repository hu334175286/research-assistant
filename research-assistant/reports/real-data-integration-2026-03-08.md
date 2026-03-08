# Real Data Integration Report (2026-03-08)

## Added papers (wireless sensing / edge intelligence)

1. RF-Pose: Through-Wall Human Pose Estimation Using Radio Signals  
   - Year: 2018  
   - Source: CVPR 2018 / arXiv:1803.07031
2. In-Edge AI: Intelligentizing Mobile Edge Computing, Caching and Communication by Deep Reinforcement Learning  
   - Year: 2019  
   - Source: IEEE Network 2019 / arXiv:1809.07866
3. Communication-Efficient Learning of Deep Networks from Decentralized Data  
   - Year: 2017  
   - Source: AISTATS 2017 / arXiv:1602.05629

## Added datasets (open-source)

1. UCI HAR Dataset  
   - Source: https://archive.ics.uci.edu/dataset/240/human+activity+recognition+using+smartphones  
   - License: CC BY 4.0  
   - Version: 1.0
2. WISDM Smartphone and Smartwatch Activity and Biometrics Dataset  
   - Source: https://www.cis.fordham.edu/wisdm/dataset.php  
   - License: CC BY 4.0  
   - Version: 1.1

## Added experiment (traceable demo)

- Name: Edge-FL-HAR baseline on UCI HAR (traceable demo)
- Linked dataset: UCI HAR Dataset
- Dataset version snapshot: 1.0
- Linked reference paper: Communication-Efficient Learning of Deep Networks from Decentralized Data
- Example metrics: top1Accuracy=0.912, f1Score=0.904

## Daily report traceability summary

`npm run report:daily` generated daily content including:
- "实验-数据集追溯摘要：最近1项中，已关联1项，版本已快照1项"
- Trace sample line with dataset ID + dataset name + snapshot

## Validation

- Build: `npm run build` ✅
- Smoke: `SMOKE_SERVER_MODE=dev npm run smoke` ✅ (via existing local server)
