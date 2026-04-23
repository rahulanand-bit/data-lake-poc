CREATE DATABASE IF NOT EXISTS mbs_analytics;
USE mbs_analytics;

DROP TABLE IF EXISTS orders_raw;

CREATE TABLE IF NOT EXISTS orders_raw (
    source_server_id STRING NOT NULL,
    order_id INT NOT NULL,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    order_label STRING,
    updated_at DATETIME,
    ingest_ts DATETIME
)
PRIMARY KEY (source_server_id, order_id)
DISTRIBUTED BY HASH(source_server_id, order_id) BUCKETS 4
PROPERTIES ("replication_num" = "1");
