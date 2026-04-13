-- Silver view for orders with minimal normalization
CREATE TEMPORARY VIEW v_orders_silver AS
SELECT
    order_id,
    TRIM(customer_name) AS customer_name,
    amount,
    UPPER(TRIM(status)) AS status,
    updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_orders_cdc;

