-- Silver view for order events
CREATE TEMPORARY VIEW v_order_events_silver AS
SELECT
    event_id,
    order_id,
    UPPER(TRIM(event_type)) AS event_type,
    event_time,
    channel,
    CURRENT_TIMESTAMP AS ingest_ts
FROM src_order_events_cdc;

