-- Silver view for payments
CREATE TEMPORARY VIEW v_order_payments_silver AS
SELECT
    payment_id,
    order_id,
    paid_amount,
    UPPER(TRIM(payment_status)) AS payment_status,
    paid_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_order_payments_cdc;

