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
- `sqlserver.password`
- `template_vars.SQLSERVER_PASSWORD`

The local SQL Server host remains `host.docker.internal`, which allows the Flink containers to reach SQL Server on the Windows host.

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
1. Insert or update a row in SQL Server:
   ```sql
   USE mbs_poc;
   GO

   INSERT INTO dbo.orders (order_id, customer_name, amount, status, updated_at)
   VALUES (7001, 'Runbook Test', 456.78, 'NEW', SYSDATETIME());
   GO
   ```
2. Query StarRocks:
   ```powershell
   docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SELECT * FROM mbs_analytics.orders_raw WHERE order_id = 7001;"
   ```
3. Confirm the row appears in StarRocks.

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
- StarRocks FE is healthy but BE is not:
  - Wait for `starrocks-be` to finish registering.
  - Recheck with `SHOW BACKENDS;`.
