# MBS Data Lake Modernization - Proposed Solution Plan

## 1) Recommended Solution

Build a bank-governed lakehouse with three layers:

- **Raw (Bronze):** Source-faithful data from databases and Excel, immutable and auditable.
- **Curated (Silver):** Cleaned, standardized, deduplicated, and conformed data.
- **Business (Gold):** Pre-aggregated marts for reporting and AI-ready feature tables.

In simple terms: **Bronze keeps the truth, Silver makes the truth usable, and Gold makes the truth fast for business.**

Use both analysis modes:

- **Script/rule-based analytics** for KPI computation and operational reporting.
- **AI-based analytics** for trend, anomaly, and performance insights.

Continue using **Power BI** in Phase 1, but repoint reports to Gold marts instead of heavy raw logs.

## 2) Why This Fits MBS

- Improves report performance by avoiding direct BI queries on high-volume logs.
- Enforces compliance with bank-level segregation, masking/encryption, and purge controls.
- Handles mixed ingestion paths (database feeds + bank Excel files).
- Creates a scalable foundation for AI without disrupting current reporting users.

## 3) Target Architecture

### 3.1 Ingestion Layer

- Database sources via CDC/incremental pipelines (near real-time where needed).
- CDC is recommended for DB-based sources so that only inserts/updates/deletes are captured instead of repeatedly copying full tables.
- Kafka is recommended for near-real-time, high-volume event movement between source systems and downstream lake pipelines.
- Excel ingestion through a controlled intake pipeline with schema checks and reconciliation.
- Excel feeds should be handled separately through file ingestion pipelines and then merged into Bronze/Silver after validation and standardization.

### 3.2 Storage and Processing

- Partition by `bank_id`, `event_date`, and `service_type`.
- Use standardized event model across DSB, FI, and Sahibank datasets.
- Build materialized aggregates at day/week/month granularity.

### 3.3 Serving Layer

- Power BI semantic model on Gold tables/marts.
- StarRocks can be used as the high-speed reporting/query engine for Power BI, serving curated Gold marts and high-performance aggregates.
- Row-level security by bank, region, and role.

### 3.4 Governance and Compliance

- Encryption at rest and in transit.
- Field-level masking/tokenization for sensitive attributes.
- Bank-specific retention and purge policies implemented as automated workflows.
- Full lineage, audit logging, and access traceability.

### 3.5 AI Layer

- Curated feature dataset (~200 points) from Silver/Gold.
- Initial use cases:
  - Agent productivity scoring
  - Revenue trend anomaly detection

### 3.6 End-to-End Architecture Flow

`Source Systems -> CDC / File Intake -> Kafka / Ingestion Pipelines -> Bronze -> Silver -> Gold -> StarRocks -> Power BI / AI`

- **Source Systems:** DSB operational DB, FI bank-specific DBs, bank Excel files, and existing reporting data where needed for transition.
- **CDC / File Intake:** CDC captures DB changes; Excel files land through controlled file intake with validation, metadata capture, and quarantine for invalid files.
- **Kafka / Ingestion Pipelines:** Kafka carries near-real-time DB events, while batch/file pipelines ingest Excel and other scheduled datasets into the lake.
- **Bronze:** Raw source-faithful storage for all ingested data, partitioned by bank/date/source for auditability and reprocessing.
- **Silver:** Standardized, validated, deduplicated, and conformed datasets across DSB, FI, and Sahibank domains.
- **Gold:** Business-ready marts and KPI tables for revenue, agent activeness, location performance, and AI-ready feature datasets.
- **StarRocks:** High-speed analytical serving layer for Power BI and low-latency reporting queries.
- **Power BI / AI:** Power BI consumes Gold/StarRocks for reports; AI models consume curated Silver/Gold data for analysis and scoring.

## 4) Performance Strategy

- Precompute heavy metrics outside BI report runtime.
- Use incremental refresh in Power BI.
- Maintain key aggregate tables, such as:
  - `agent_day_summary`
  - `location_day_summary`
  - `bank_month_revenue_summary`
- Use watermark-based ingestion and idempotent merge logic.
- Define SLA tiers:
  - Executive dashboards: <10 seconds
  - Analytical deep dives: relaxed SLA

## 5) Compliance-by-Design

- Enforce bank isolation (logical minimum; physical separation where mandated).
- Respect data movement policy:
  - Transactional data remains restricted.
  - Summarized data movement only through approval workflow.
- Automate purge lifecycle:
  - Policy registry -> purge execution -> purge audit evidence.
- Apply least-privilege access model with approval trails.

## 6) 90-Day Implementation Plan

### Weeks 1-2: Discovery and Control Baseline

- Finalize KPI dictionary and report definitions.
- Complete source-to-KPI mapping and data inventory.
- Define compliance matrix (masking, segregation, retention, approval flow).
- Resolve volume baseline discrepancy (4 crore vs 8 crore planning scenarios).

### Weeks 3-6: DSB Pilot (Priority Stream)

- Build ingestion and Silver/Gold pipelines for top DSB datasets.
- Implement first three marts:
  - Revenue
  - Agent activeness
  - Location performance
- Repoint top Power BI reports and benchmark latency improvements.

### Weeks 7-9: FI and Excel Standardization

- Integrate FI sources.
- Implement bank Excel standardization and quality checks.
- Add reconciliation reporting between bank files and system data.

### Weeks 10-12: AI Pilot and Operational Hardening

- Deliver first AI insights for selected use cases.
- Add monitoring, data quality scorecards, lineage views, and runbooks.
- Stabilize SLAs and operational ownership.

## 7) Expected Outcomes

- 50-80% reduction in runtime for high-usage reports.
- Near-real-time freshness for priority business entities.
- Strong compliance posture with auditable controls.
- Scalable data foundation for both BI and AI growth.

## 8) Immediate Next Decisions

- Confirm analytics mode: AI-only vs AI + scripts (recommended: AI + scripts).
- Confirm reporting path: continue Power BI in Phase 1 (recommended: yes).
- Confirm hosting model: on-prem, cloud, or hybrid.
- Confirm segregation requirement per bank: logical vs physical.
- Confirm first-wave report list and SLA targets.
