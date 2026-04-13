CREATE DATABASE IF NOT EXISTS mbs_analytics;
USE mbs_analytics;

CREATE TABLE IF NOT EXISTS orders_raw (
    order_id INT NOT NULL,
    customer_name STRING,
    amount DECIMAL(12, 2),
    status STRING,
    updated_at DATETIME,
    ingest_ts DATETIME
)
PRIMARY KEY (order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES ("replication_num" = "1");
