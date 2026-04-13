# Code Flow Walkthrough

## Execution path from command to running stream

1. **Operator triggers deploy**
- Command: `python orchestrator/deploy.py deploy`
- Entry point: `orchestrator/deploy.py -> main()`

2. **Config load**
- File: `pipelines/dsb/dsb_core_cdc/config/dev.yaml`
- Functions:
  - `load_config()`
  - reads job, connection, runtime, and template variables.

3. **SQL discovery and ordering**
- Function: `list_sql_files()`
- Uses `run_order` from config:
  - `00_sources`
  - `90_sinks`
- Files are sorted and collected deterministically.

4. **Template render**
- Function: `render_sql_files()`
- Replaces placeholders (for example `{{SQLSERVER_HOST}}`, `{{STARROCKS_HOST}}`).
- Writes rendered files to `runtime/rendered/`.

5. **Flink SQL submission**
- Function: `run_sql_files()`
- For each rendered SQL file, executes:
  - `docker exec flink-sql-client /opt/flink/bin/sql-client.sh -f <rendered file>`
- Flink creates source/sink objects and starts streaming `INSERT` statements.

6. **Runtime behavior inside Flink**
- CDC sources consume initial snapshot and subsequent changes.
- Sink connectors stream direct raw results into StarRocks tables.

7. **Metadata logging**
- Function: `append_metadata()`
- Writes deployment record to:
  - `orchestrator/.deploy/deployments.jsonl`
- Captures job name, version, checksum, and timestamp.

## Operational commands flow
- `status`:
  - `docker ps` summary
  - Flink REST jobs overview (`/jobs/overview`)
- `stop`:
  - fetch running jobs
  - cancel each through Flink REST
- `restart`:
  - executes `stop` followed by `deploy`

## File-to-responsibility map
- Source connectors: `sql/00_sources/*.sql`
- StarRocks raw sinks and inserts: `sql/90_sinks/*.sql`
- Deployment logic: `orchestrator/deploy.py`
- Contracts: `contracts/*.yaml`
