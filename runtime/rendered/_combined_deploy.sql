SET 'execution.target' = 'remote';
SET 'rest.address' = 'jobmanager';
SET 'rest.port' = '8081';

ADD JAR 'file:///opt/flink/connectors/flink-connector-jdbc-3.2.0-1.19.jar';
ADD JAR 'file:///opt/flink/connectors/flink-connector-starrocks-1.2.14_flink-1.19.jar';
ADD JAR 'file:///opt/flink/connectors/flink-sql-connector-sqlserver-cdc-3.2.1.jar';
ADD JAR 'file:///opt/flink/connectors/mssql-jdbc-13.4.0.jre11.jar';
ADD JAR 'file:///opt/flink/connectors/mysql-connector-j-8.4.0.jar';

-- BEGIN 001_orders_source_srv1.sql
-- Source: SQL Server CDC table for orders (srv1)
CREATE TABLE IF NOT EXISTS src_orders_cdc_srv1 (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = 'sqlsrv1',
    'port' = '1433',
    'username' = 'sa',
    'password' = 'Sql1234!',
    'database-name' = 'mbs_poc',
    'table-name' = 'dbo.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial',
    'debezium.database.encrypt' = 'false',
    'debezium.database.trustServerCertificate' = 'true'
);
-- END 001_orders_source_srv1.sql

-- BEGIN 002_orders_source_srv2.sql
-- Source: SQL Server CDC table for orders (srv2)
CREATE TABLE IF NOT EXISTS src_orders_cdc_srv2 (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = 'sqlsrv2',
    'port' = '1433',
    'username' = 'sa',
    'password' = 'Sql1234!',
    'database-name' = 'mbs_poc',
    'table-name' = 'dbo.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial',
    'debezium.database.encrypt' = 'false',
    'debezium.database.trustServerCertificate' = 'true'
);
-- END 002_orders_source_srv2.sql

-- BEGIN 003_orders_source_srv3.sql
-- Source: SQL Server CDC table for orders (srv3)
CREATE TABLE IF NOT EXISTS src_orders_cdc_srv3 (
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
    'connector' = 'sqlserver-cdc',
    'hostname' = 'sqlsrv3',
    'port' = '1433',
    'username' = 'sa',
    'password' = 'Sql1234!',
    'database-name' = 'mbs_poc',
    'table-name' = 'dbo.orders',
    'scan.startup.mode' = 'initial',
    'debezium.snapshot.mode' = 'initial',
    'debezium.database.encrypt' = 'false',
    'debezium.database.trustServerCertificate' = 'true'
);
-- END 003_orders_source_srv3.sql

-- BEGIN 901_starrocks_sink_tables.sql
-- Flink sink table definitions for POC direct landing (raw tables)
CREATE TABLE IF NOT EXISTS sink_orders_raw (
    source_server_id STRING,
    order_id INT,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at TIMESTAMP(3),
    ingest_ts TIMESTAMP(3),
    PRIMARY KEY (source_server_id, order_id) NOT ENFORCED
) WITH (
    'connector' = 'starrocks',
    'jdbc-url' = 'jdbc:mysql://starrocks-fe:9030',
    'load-url' = 'starrocks-fe:8030',
    'sink.version' = 'V1',
    'table-name' = 'orders_raw',
    'database-name' = 'mbs_analytics',
    'username' = 'root',
    'password' = '',
    'sink.semantic' = 'at-least-once',
    'sink.buffer-flush.max-rows' = '64000',
    'sink.buffer-flush.interval-ms' = '3000',
    'sink.max-retries' = '3'
);
-- END 901_starrocks_sink_tables.sql

-- BEGIN 910_insert_raw.sql
-- Start direct raw streaming inserts for POC
INSERT INTO sink_orders_raw
SELECT
    'srv1' AS source_server_id,
    order_id,
    customer_name,
    amount,
    status,
    updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_orders_cdc_srv1
UNION ALL
SELECT
    'srv2' AS source_server_id,
    order_id,
    customer_name,
    amount,
    status,
    updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_orders_cdc_srv2
UNION ALL
SELECT
    'srv3' AS source_server_id,
    order_id,
    customer_name,
    amount,
    status,
    updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_orders_cdc_srv3;
-- END 910_insert_raw.sql
