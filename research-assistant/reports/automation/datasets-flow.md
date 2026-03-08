# Datasets Flow Check Report

- GeneratedAt: 2026-03-08T17:16:49.559Z
- Overall: PASS
- Datasets: 5
- Splits: 15
- Experiments: 3
- Linked Experiments: 3
- Trace Ready (linked + datasetExists + versionPinned): 3

## Dataset -> Splits Summary

| datasetId | name | version | splitCount | splits | ratioSum | linkedExperiments |
| --- | --- | --- | --- | --- | --- | --- |
| cmmhpygla0003whf0pyljxf8y | UCI HAR Dataset | 1.0 | 3 | test, train, val | 1.0000 | 1 |
| cmmhpygle0004whf0t513w1rp | WISDM Smartphone and Smartwatch Activity and Biometrics Dataset | 1.1 | 3 | test, train, val | 1.0000 | 0 |
| cmmi0kl1s0005whws051dc3g1 | OPPORTUNITY Activity Recognition Dataset | 1.0 | 3 | test, train, val | 1.0000 | 0 |
| cmmi0kl1v0006whwsc83mzj4k | MHEALTH Dataset | 1.0 | 3 | test, train, val | 1.0000 | 1 |
| cmmi0kl1z0007whwspfp8t2j0 | PAMAP2 Physical Activity Monitoring Dataset | 2.0 | 3 | test, train, val | 1.0000 | 1 |

## Experiments -> Dataset Trace Summary

| experimentId | name | datasetId | datasetName | snapshot | datasetExists | versionPinned | versionMatch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cmmhpyglh0006whf0dxs3q6mn | Edge-FL-HAR baseline on UCI HAR (traceable demo) | cmmhpygla0003whf0pyljxf8y | UCI HAR Dataset | 1.0 | yes | yes | yes |
| cmmi0kl260009whwsmr8ea6s0 | DeepSense baseline on MHEALTH (traceable real sample) | cmmi0kl1v0006whwsc83mzj4k | MHEALTH Dataset | 1.0 | yes | yes | yes |
| cmmi0kl28000bwhwsoffdm9sn | FedProx robustness on PAMAP2 (traceable real sample) | cmmi0kl1z0007whwspfp8t2j0 | PAMAP2 Physical Activity Monitoring Dataset | 2.0 | yes | yes | yes |

## Findings

- ✅ 无异常