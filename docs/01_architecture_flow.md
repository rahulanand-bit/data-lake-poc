# Architecture Flow

This project implements a local CDC streaming path:

`SQL Server 2019 (CDC enabled) -> Flink SQL job -> StarRocks -> Power BI`

## End-to-End flow
1. SQL Server CDC captures row-level changes from source table (`orders`).
2. Flink SQL Server CDC source connectors read snapshot + change stream.
3. Flink streams source rows directly to StarRocks raw sink table (`orders_raw`).
4. BI tools query StarRocks (`9030`) for POC reporting.

## Component responsibilities
- SQL Server: source of truth and CDC log emission.
- Flink runtime: stateful stream execution, checkpoints, and continuous ingestion.
- SQL files: pipeline logic (sources + direct raw sinks for POC).
- Python orchestrator: render templates, execute SQL in order, collect deployment metadata.
- StarRocks: low-latency analytical serving layer for reports.

## Failure and recovery behavior
- Checkpoint path is local filesystem for this phase (`runtime/state/checkpoints`).
- On Flink restart, jobs recover from the last checkpoint and continue consuming CDC.
- Deployment metadata (`orchestrator/.deploy/deployments.jsonl`) provides run/version traceability.
- In UAT/Prod, move checkpoint/savepoint storage to S3-compatible object storage.
