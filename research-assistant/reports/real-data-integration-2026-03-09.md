# Real Data Integration Report (2026-03-09)

## Added papers (wireless sensing / edge intelligence)

1. RF-Pose: Through-Wall Human Pose Estimation Using Radio Signals  
2. In-Edge AI: Intelligentizing Mobile Edge Computing, Caching and Communication by Deep Reinforcement Learning  
3. Communication-Efficient Learning of Deep Networks from Decentralized Data  
4. DeepSense: A Unified Deep Learning Framework for Time-Series Mobile Sensing Data Processing  
5. Neurosurgeon: Collaborative Intelligence Between the Cloud and Mobile Edge  
6. JointDNN: An Efficient Training and Inference Engine for Intelligent Mobile Cloud Computing Services  
7. Edge Intelligence: Paving the Last Mile of Artificial Intelligence with Edge Computing  
8. Federated Optimization in Heterogeneous Networks

## Added datasets (open-source)

1. UCI HAR Dataset (v1.0)
2. WISDM Smartphone and Smartwatch Activity and Biometrics Dataset (v1.1)
3. OPPORTUNITY Activity Recognition Dataset (v1.0)
4. MHEALTH Dataset (v1.0)
5. PAMAP2 Physical Activity Monitoring Dataset (v2.0)

## Added experiments (traceable, linked)

1. Edge-FL-HAR baseline on UCI HAR (traceable demo)  
   - datasetId: UCI HAR Dataset -> snapshot version 1.0  
   - reference paper: Communication-Efficient Learning of Deep Networks from Decentralized Data

2. DeepSense baseline on MHEALTH (traceable real sample)  
   - datasetId: MHEALTH Dataset -> snapshot version 1.0  
   - reference paper: DeepSense: A Unified Deep Learning Framework for Time-Series Mobile Sensing Data Processing

3. FedProx robustness on PAMAP2 (traceable real sample)  
   - datasetId: PAMAP2 Physical Activity Monitoring Dataset -> snapshot version 2.0  
   - reference paper: Federated Optimization in Heterogeneous Networks

## Delivery coverage update

- /delivery 页面新增状态占比展示（完成/进行中/待开发）
- /api/delivery-status summary 新增：completionRate / inProgressRate / plannedRate
- delivery checklist 新增真实条目：`real-traceable-content-seeding`（completed）

## Validation

- Seed: `npm run seed:real` ✅
- Build: `npm run build` ✅
- Smoke: `npm run smoke` ✅
