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
