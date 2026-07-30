# Phase 2: Agent Framework — QX Predictive Maintenance

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Generated:** 2026-06-24
> **Back to:** [README.md](README.md)

---

## Architecture

```
USERS (Natural Language)
    ↓
ORCHESTRATOR AGENT (intent classification)
    ├── Component Lifecycle Agent ──→ Propulsion Reliability Intelligence Genie Space
    ├── Defect Intelligence Agent ──→ Propulsion Reliability Intelligence Genie Space
    ├── Inventory & Spares Agent ──→ Inventory & Supply Chain Intelligence Genie Space
    └── Procurement & Overhaul Agent ──→ Inventory & Supply Chain Intelligence Genie Space
```

**Pattern:** Orchestrator + 4 domain workers (1:1 agent-to-domain mapping)
**Agent-to-Genie:** 2 Genie Spaces shared across 4 agents (2 agents per Genie Space)

## Agent Definitions

| # | Agent | Domain | Genie Space | Use Case Refs |
|---|-------|--------|-------------|---------------|
| 0 | QX Predictive Maintenance Orchestrator | Cross-domain | Both spaces (intent classification) | All |
| 1 | Component Lifecycle Agent | ⚙️ Component Lifecycle | Propulsion Reliability Intelligence | UC-001, UC-010 |
| 2 | Defect Intelligence Agent | ⚠️ Defect Intelligence | Propulsion Reliability Intelligence | UC-002, UC-003, UC-004, UC-010 |
| 3 | Inventory & Spares Agent | 📦 Inventory & Spares | Inventory & Supply Chain Intelligence | UC-005, UC-006, UC-007 |
| 4 | Procurement & Overhaul Agent | 🛠️ Procurement & Overhaul | Inventory & Supply Chain Intelligence | UC-008, UC-009 |

### Orchestrator Agent

**Purpose:** Routes user queries to the appropriate domain agent via intent classification.
**Model Endpoint:** `databricks-claude-Opus-4-6`
**Memory:** Lakebase CheckpointSaver (short-term), Lakebase DatabricksStore (long-term)

**Routing Rules:**
- MTBUR, removal, time-on-wing, component history → Component Lifecycle Agent
- Defect, ATA, delay, cancellation, IFSD, deferral, linkage → Defect Intelligence Agent
- Spare, inventory, stock-out, LLP, red-line, condition code → Inventory & Spares Agent
- Order, procurement, repair, teardown, shop finding → Procurement & Overhaul Agent
- Cross-domain or ambiguous → Query both Genie Spaces and synthesize

### Domain Agent Tools

Each domain agent has:
1. **`query_{domain}_genie`** — Genie Conversation API tool for natural language queries
2. **`get_{domain}_alerts`** — SQL query tool for active alerts in the domain
3. **`get_{domain}_monitor_status`** — Lakehouse Monitor status check

## Evaluation Configuration

**Dataset:** `${catalog}.${gold_schema}.agent_eval_dataset`
**Questions per domain:** 10 (total: 40 evaluation questions)
**Scoring:** MLflow GenAI scorers — relevance, faithfulness, groundedness

### Sample Evaluation Questions

| Domain | Question | Expected Behavior |
|--------|----------|-------------------|
| ⚙️ Component Lifecycle | "What is the MTBUR for part 1234-5678?" | Routes to Component Lifecycle Agent → calls get_mtbur_analysis TVF |
| ⚠️ Defect Intelligence | "Top 5 ATA chapters by delay minutes this month" | Routes to Defect Intelligence Agent → calls defect_intelligence_analytics_metrics MV |
| 📦 Inventory & Spares | "LLPs with fewer than 500 cycles remaining" | Routes to Inventory & Spares Agent → calls get_llp_redline_status TVF |
| 🛠️ Procurement & Overhaul | "Open repair orders exceeding lead time" | Routes to Procurement & Overhaul Agent → calls get_order_status_summary TVF |

## Deployment Order

```
Phase 1.6 Genie Spaces (2) ──→ Phase 2 Agents (5)
```

**CRITICAL:** Genie Spaces MUST be deployed and verified before agents can be wired. Three-level testing:
1. **Asset-level:** Verify all TVFs, MVs, and Gold tables are queryable
2. **Genie-level:** Verify each Genie Space answers sample questions correctly
3. **Agent-level:** Verify orchestrator routes correctly and domain agents return accurate answers
