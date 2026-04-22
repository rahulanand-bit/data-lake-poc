# Execution Runbook

## Prerequisites
1. SQL Server 2019 is running with SQL Agent enabled.
2. CDC is enabled on `mbs_poc.dbo.orders`.
3. Docker Desktop is running.
4. Python is available through `py`.
5. Connector jars exist in `connectors/`:
   - `flink-sql-connector-sqlserver-cdc-3.2.1.jar`
   - `flink-connector-starrocks-1.2.14_flink-1.19.jar`
   - `mssql-jdbc-13.4.0.jre11.jar`

## Verify SQL Server version (3-source containers)
Use these checks to confirm all source DB containers are SQL Server 2019.

1. Check image tags:
   ```powershell
   docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}"
   ```
   Expected for sources:
   - `sqlsrv1  mcr.microsoft.com/mssql/server:2019-latest`
   - `sqlsrv2  mcr.microsoft.com/mssql/server:2019-latest`
   - `sqlsrv3  mcr.microsoft.com/mssql/server:2019-latest`

2. Check engine version from each container:
   ```powershell
   docker exec sqlsrv1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Sql1234!" -C -Q "SELECT @@VERSION"
   docker exec sqlsrv2 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Sql1234!" -C -Q "SELECT @@VERSION"
   docker exec sqlsrv3 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Sql1234!" -C -Q "SELECT @@VERSION"
   ```
   Expected result contains:
   - `Microsoft SQL Server 2019`
   - `15.x` build (for example `15.0.4465.1`)
   - `Developer Edition (64-bit)`

## Working topology
This local POC now uses a proper StarRocks cluster layout:
- `starrocks-fe` : FE service
- `starrocks-be` : BE service
- `flink-jobmanager`, `flink-taskmanager`, `flink-sql-client`

Important ports:
- Flink UI: `http://localhost:8081`
- StarRocks FE SQL port: `localhost:9030`
- StarRocks FE HTTP port: `localhost:8030`
- StarRocks BE HTTP port: `localhost:8040`

## StarRocks credentials
- SQL username: `root`
- SQL password: empty string

Use those credentials for SQL access on port `9030`.

Port `8030` is the FE HTTP service used by the Flink StarRocks connector for stream load. It is not the main SQL login endpoint.

## Startup sequence
1. Start the stack:
   ```powershell
   docker compose up -d
   ```
2. Confirm services:
   ```powershell
   docker compose ps
   ```
3. Confirm FE and BE are healthy:
   ```powershell
   docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SHOW FRONTENDS; SHOW BACKENDS;"
   ```
4. Bootstrap the target table once:
   ```powershell
   Get-Content .\docs\starrocks_bootstrap.sql -Raw | docker exec -i starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot
   ```

## Configure environment
Edit [dev.yaml](/C:/Users/caw-dev/Desktop/data_lake/pipelines/dsb/dsb_core_cdc/config/dev.yaml):
- `sqlservers` list (`source_server_id`, host, port, user, password, database, schema, table)

The local SQL Server host remains `host.docker.internal`, which allows the Flink containers to reach SQL Server on the Windows host.

Sample multi-server section:
```yaml
sqlservers:
  - source_server_id: srv1
    host: host.docker.internal
    port: 1433
    username: sa
    password: Sql1234
    database: mbs_poc
    schema: dbo
    table: orders
  - source_server_id: srv2
    host: host.docker.internal
    port: 1433
    username: sa
    password: Sql1234
    database: mbs_poc
    schema: dbo
    table: orders
  - source_server_id: srv3
    host: host.docker.internal
    port: 1433
    username: sa
    password: Sql1234
    database: mbs_poc
    schema: dbo
    table: orders
```

## Deploy pipeline
1. Install Python dependencies if needed:
   ```powershell
   py -m pip install -r orchestrator/requirements.txt
   ```
2. Deploy the Flink SQL job:
   ```powershell
   py orchestrator/deploy.py deploy
   ```
3. Check status:
   ```powershell
   py orchestrator/deploy.py status
   ```

Expected result:
- one Flink job in `RUNNING` state
- `starrocks-fe` and `starrocks-be` up

## Stop or restart
Stop:
```powershell
py orchestrator/deploy.py stop
```

Restart:
```powershell
py orchestrator/deploy.py restart
```

## Validate CDC end-to-end
1. Insert or update rows in each SQL Server source.
2. Query StarRocks totals and per-source counts:
   ```powershell
   docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SELECT COUNT(*) AS total_rows FROM mbs_analytics.orders_raw; SELECT source_server_id, COUNT(*) AS rows_per_source FROM mbs_analytics.orders_raw GROUP BY source_server_id ORDER BY source_server_id;"
   ```
3. Query one known key by lineage:
   ```powershell
   docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SELECT source_server_id, order_id, customer_name, amount, status, updated_at, ingest_ts FROM mbs_analytics.orders_raw WHERE source_server_id IN ('srv1','srv2','srv3') AND order_id = 7001 ORDER BY source_server_id;"
   ```
4. Confirm rows from each server arrive with the correct `source_server_id`.

## Lag/health checks
1. Flink job state:
   ```powershell
   py orchestrator/deploy.py status
   ```
2. StarRocks ingest freshness:
   ```powershell
   docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SELECT source_server_id, MAX(updated_at) AS max_source_ts, MAX(ingest_ts) AS max_ingest_ts FROM mbs_analytics.orders_raw GROUP BY source_server_id ORDER BY source_server_id;"
   ```
3. Optional point validation query:
   ```sql
   SELECT source_server_id, order_id, status, updated_at, ingest_ts
   FROM mbs_analytics.orders_raw
   ORDER BY source_server_id, order_id DESC
   LIMIT 20;
   ```

## Live monitoring
Flink task execution and sink errors:
```powershell
docker logs -f --tail 100 flink-taskmanager
```

Flink job lifecycle:
```powershell
docker logs -f --tail 100 flink-jobmanager
```

StarRocks FE:
```powershell
docker logs -f --tail 100 starrocks-fe
```

StarRocks BE:
```powershell
docker logs -f --tail 100 starrocks-be
```

Press `Ctrl + C` to stop following logs.

## Common issues
- Flink job not visible in status:
  - Run `py orchestrator/deploy.py deploy` again and inspect `flink-jobmanager` logs.
- SQL Server connection failure from Flink:
  - Verify `host.docker.internal`, SQL authentication, and SQL Server TCP/IP.
- CDC source starts but no data lands:
  - Check `flink-taskmanager` logs first.
  - Then verify `SHOW BACKENDS;` from StarRocks FE.
- Missing source_server_id lineage:
  - Confirm source SQL files are named with suffix `_srv1.sql`, `_srv2.sql`, `_srv3.sql`.
  - Confirm matching IDs exist in `sqlservers` list in `dev.yaml`.
- StarRocks FE is healthy but BE is not:
  - Wait for `starrocks-be` to finish registering.
  - Recheck with `SHOW BACKENDS;`.
