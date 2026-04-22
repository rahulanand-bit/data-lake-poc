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
    'jdbc-url' = 'jdbc:mysql://{{STARROCKS_HOST}}:{{STARROCKS_QUERY_PORT}}',
    'load-url' = '{{STARROCKS_HOST}}:{{STARROCKS_LOAD_PORT}}',
    'sink.version' = 'V1',
    'table-name' = 'orders_raw',
    'database-name' = '{{STARROCKS_DATABASE}}',
    'username' = '{{STARROCKS_USERNAME}}',
    'password' = '{{STARROCKS_PASSWORD}}',
    'sink.semantic' = 'at-least-once',
    'sink.buffer-flush.max-rows' = '64000',
    'sink.buffer-flush.interval-ms' = '3000',
    'sink.max-retries' = '3'
);
