-- Lightweight joined projection for reporting
CREATE TEMPORARY VIEW v_order_activity_gold AS
SELECT
    o.order_id,
    o.customer_name,
    o.amount AS order_amount,
    o.status AS order_status,
    COALESCE(p.total_paid_amount, 0) AS total_paid_amount,
    COALESCE(e.event_count, 0) AS event_count,
    o.updated_at,
    CURRENT_TIMESTAMP AS ingest_ts
FROM v_orders_silver o
LEFT JOIN (
    SELECT order_id, SUM(paid_amount) AS total_paid_amount
    FROM v_order_payments_silver
    GROUP BY order_id
) p ON o.order_id = p.order_id
LEFT JOIN (
    SELECT order_id, COUNT(1) AS event_count
    FROM v_order_events_silver
    GROUP BY order_id
) e ON o.order_id = e.order_id;

