# MBS Data Lake & Reporting Modernization

## 1) Client Context

- **Client:** Manipal (MBS)
- **Core Business:** KYC and related field operations
- **Current Technology Stack:**
  - SQL Server
  - .NET backend
  - React frontend (Web + Android)
  - BI tools connected to reporting database

## 2) Current Data & Reporting Setup

- Data from multiple operational databases is synchronized into a central reporting database.
- Synchronization appears near-real-time and replace-style.
- BI tools query the reporting database for report generation.
- Data volume is at **TB scale**.
- High log volume is causing report performance degradation at larger date ranges.
- Key analytics goals:
  - Agent performance
  - Revenue performance
  - Geography/location analysis
  - AI-based analysis across ~200 data points

## 3) Business Streams and Data Characteristics

### 3.1 DSB (Doorstep Banking Services)

- Includes services such as KYC, NACH, CPV, etc.
- Highest revenue stream.
- One agent can work for multiple banks.
- Single database with logical bank-level separation.

### 3.2 FI (Financial Inclusion)

- Separate databases for different banks.
- One agent works for one bank only.
- FI operational model uses two-person teams:
  - One fixed agent
  - One mobile agent
- Data arrives through two channels:
  1. **MBS-owned assets:** DB -> reporting DB
  2. **Bank-owned assets:** Excel from bank -> DB -> reporting server

### 3.3 Sahibank Partner

- Supports money transfers, recharges, and minor services.
- Lower usage but still active.

## 4) Compliance and Governance Constraints

- Transactional data cannot be copied freely.
- Summarized data can be copied only after bank approval.
- Bank-specific data purging policies must be enforced.
- Bank-level segregation and masking/encryption are mandatory where required.

## 5) Observed Data Volume Scenarios (As Provided)

- HDFC example: `4 lakh leads x 6 logs = 24 lakh logs`
- All banks (6 months): approximately `80-90 lakh logs`
- 2 FY estimate appears in two variants:
  - ~4 crore logs (one estimate)
  - ~8 crore logs (alternate estimate based on 3-month extrapolation)

> **Note:** Volume baseline is inconsistent and must be validated before final architecture sizing.

## 6) Problem Statement

MBS currently relies on BI tools querying a SQL Server reporting database that is continuously synchronized from multiple operational sources. As data volume has scaled to TB levels and log records have reached multi-crore ranges over multi-year periods, report generation-especially for DSB and, secondarily, FI-has become increasingly slow due to heavy computation on large log datasets.

At the same time, MBS must comply with strict banking governance requirements, including restrictions on transactional data movement, controlled use of summarized data, bank-wise data segregation, masking/encryption, and policy-driven data purging.

MBS therefore needs a data lake-centric analytics architecture that can ingest near-real-time data from heterogeneous sources (database feeds and bank-provided Excel files), enforce governance and retention controls, and deliver fast, scalable reporting for revenue, location, and agent-performance analytics, while enabling AI-driven analysis across ~200 data points.

## 7) Refined Objective Statement

Design and implement a compliant, bank-segregated, near-real-time analytics platform on a data lake that:

1. Improves reporting performance for high-volume datasets.
2. Preserves regulatory and compliance boundaries.
3. Standardizes ingestion from system databases and bank Excel inputs.
4. Enables reliable agent performance reporting and AI analytics.

## 8) Key Challenges

- Dual ingestion patterns (database sync + bank Excel uploads)
- High-cardinality log data and report performance pressure
- Strict compliance constraints on data copying and retention
- Multi-bank segregation requirements (logical and/or physical)
- Data quality and standardization issues for external Excel inputs
- Near-real-time data freshness requirements without overloading source systems

## 9) Recommended Reporting Scope (Phase 1)

1. Revenue reports (commissions, month-on-month growth)
2. Location and agent-level performance reports
3. Agent activity/activeness reports
4. Prioritization order: **DSB first**, then **FI**, then **Sahibank Partner**
