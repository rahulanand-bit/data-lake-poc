-- Start direct raw streaming inserts for POC
INSERT INTO sink_orders_raw
SELECT
    order_id,
    customer_name,
    amount,
    status,
    updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_orders_cdc;
