# Phase 1 Addendum 1.1 — ML Models

> **Agent Domain Framework applies.** ML models organized by domain.
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | Model | Domain | Type | Feature Table | Label | Use Case Refs |
|---|-------|--------|------|---------------|-------|---------------|
| 1 | Removal Rate Forecaster | ⚙️ Component Lifecycle | Regression | `component_lifecycle_features` | Monthly removal count per P/N | UC-001, UC-006 |
| 2 | Defect Anomaly Detector | ⚠️ Defect Intelligence | Anomaly Detection | `defect_intelligence_features` | Anomaly flag (unsupervised) | UC-002, UC-003 |

---

## Feature Tables

### 1. `component_lifecycle_features`

**Domain:** ⚙️ Component Lifecycle & Reliability
**Primary Keys:** `pn`, `feature_month`
**Source Gold Tables:** `fact_component_removal`, `dim_part`, `dim_date`

| Feature | Type | Derivation |
|---------|------|-----------|
| `removal_count_30d` | INT | Removals in the last 30 days for this P/N |
| `removal_count_90d` | INT | Removals in the last 90 days for this P/N |
| `avg_hours_at_removal_90d` | DOUBLE | Average hours_installed at removal, 90-day window |
| `avg_cycles_at_removal_90d` | DOUBLE | Average cycles_installed at removal, 90-day window |
| `unscheduled_ratio_90d` | DOUBLE | Unscheduled / total removals, 90-day window |
| `removal_velocity_trend` | DOUBLE | Slope of removal count over last 6 months |
| `fleet_penetration` | DOUBLE | % of fleet tails with at least one removal of this P/N |
| `category` | STRING | Part category from dim_part (Rotable, Expendable, etc.) |

### 2. `defect_intelligence_features`

**Domain:** ⚠️ Defect Intelligence
**Primary Keys:** `chapter`, `section`, `feature_week`
**Source Gold Tables:** `fact_defect`, `dim_ata_chapter`, `dim_date`

| Feature | Type | Derivation |
|---------|------|-----------|
| `defect_count_7d` | INT | Defects in the last 7 days for this ATA section |
| `defect_count_30d` | INT | Defects in the last 30 days for this ATA section |
| `delay_minutes_30d` | DOUBLE | Total delay minutes, 30-day window |
| `cancellation_count_30d` | INT | Cancellation count, 30-day window |
| `ifsd_count_90d` | INT | IFSD events, 90-day window |
| `deferral_rate_30d` | DOUBLE | Deferral count / total defects, 30-day window |
| `defect_volume_z_score` | DOUBLE | Current week count vs 12-week rolling avg (z-score) |
| `delay_impact_trend` | DOUBLE | Slope of delay minutes over last 6 months |

---

## Model Definitions

### 1. Removal Rate Forecaster

**Domain:** ⚙️ Component Lifecycle & Reliability
**Model Type:** Regression (time-series forecasting)
**Algorithm:** XGBRegressor (with LightGBM as alternative)
**Use Case Refs:** UC-001, UC-006
**Feature Table:** `component_lifecycle_features`
**Label Column:** `removal_count_next_30d` (INT — removals in the next 30 days for this P/N)
**Label Derivation:** Forward-looking 30-day removal count from `fact_component_removal`

**Business Questions:**
- "Which part numbers will have the highest removal volume next month?"
- "Should we pre-position spares at SEA based on predicted removal rates?"
- "What is the forecasted demand for high-value rotables in Q3?"

**Training Configuration:**
- Training window: 24 months of historical data
- Retraining cadence: Monthly
- Validation: Time-series split (train on months 1-18, validate on 19-24)
- Experiment tracking: MLflow

**Success Metrics:**
- MAE < 2 removals per P/N per month
- MAPE < 25% for top 50 P/Ns by volume

---

### 2. Defect Anomaly Detector

**Domain:** ⚠️ Defect Intelligence
**Model Type:** Anomaly Detection (unsupervised)
**Algorithm:** Isolation Forest
**Use Case Refs:** UC-002, UC-003
**Feature Table:** `defect_intelligence_features`
**Label Column:** N/A (unsupervised — outputs anomaly_score)
**Label Derivation:** Anomaly score from Isolation Forest; threshold at 95th percentile

**Business Questions:**
- "Are there any unusual defect patterns emerging this week?"
- "Which ATA sections are behaving anomalously compared to historical norms?"
- "Is the ATA 73 defect spike a true anomaly or normal seasonal variation?"

**Training Configuration:**
- Training window: 12 months of historical weekly features
- Retraining cadence: Quarterly
- Contamination parameter: 0.05 (5% expected anomaly rate)
- Experiment tracking: MLflow

**Success Metrics:**
- Precision > 80% (validated against manually flagged reliability events)
- Recall > 70% for known IFSD-preceding defect clusters

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Models registered in MLflow | 100% |
| Feature tables refreshed on schedule | Daily (features), Monthly (training) |
| Model predictions available via Genie Spaces | Yes (as prediction tables) |
| All models trace to business use cases | 100% |
