import { cfg } from "../config.js";
const TABLE = "mbs_analytics.orders_raw";
const allowedDimensions = new Set([
    "source_server_id",
    "order_id",
    "customer_name",
    "status",
    "updated_at",
    "ingest_ts",
]);
const metricSqlMap = {
    order_count: "COUNT(*) AS order_count",
    total_amount: "ROUND(SUM(amount), 2) AS total_amount",
    avg_amount: "ROUND(AVG(amount), 2) AS avg_amount",
    max_amount: "MAX(amount) AS max_amount",
    min_amount: "MIN(amount) AS min_amount",
};
function normalizeDimension(field) {
    if (allowedDimensions.has(field))
        return field;
    if (field === "date" || field === "updated_date")
        return "DATE(updated_at)";
    return null;
}
function applyWhereClauses(input, user, values) {
    const clauses = [];
    if (user.scopes.length > 0) {
        const scopePlaceholders = user.scopes.map(() => "?").join(", ");
        clauses.push(`source_server_id IN (${scopePlaceholders})`);
        values.push(...user.scopes);
    }
    if (input.filters?.source_server_id) {
        clauses.push("source_server_id = ?");
        values.push(String(input.filters.source_server_id));
    }
    if (input.filters?.status) {
        clauses.push("status = ?");
        values.push(String(input.filters.status));
    }
    if (input.time_range?.from) {
        clauses.push("updated_at >= ?");
        values.push(input.time_range.from);
    }
    if (input.time_range?.to) {
        clauses.push("updated_at <= ?");
        values.push(input.time_range.to);
    }
    return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}
export function buildQuery(tool, input, user) {
    const values = [];
    const whereSql = applyWhereClauses(input, user, values);
    const limit = Math.max(1, Math.min(input.limit ?? 100, cfg.maxQueryRows));
    if (tool === "overview_tool") {
        const groupBy = (input.group_by ?? []).map(normalizeDimension).filter(Boolean);
        const metrics = (input.metrics ?? ["order_count", "total_amount"])
            .map((m) => metricSqlMap[m])
            .filter(Boolean);
        const selectCols = [...groupBy, ...metrics];
        const selectSql = selectCols.length > 0 ? selectCols.join(", ") : metricSqlMap.order_count;
        const groupSql = groupBy.length > 0 ? `GROUP BY ${groupBy.join(", ")}` : "";
        const orderSql = groupBy.length > 0 ? `ORDER BY ${groupBy[0]} ASC` : "";
        const sql = `SELECT ${selectSql} FROM ${TABLE} ${whereSql} ${groupSql} ${orderSql} LIMIT ${limit}`;
        return { sql, values };
    }
    if (tool === "trends_tool") {
        const metric = metricSqlMap[input.metrics?.[0] ?? "order_count"] ?? metricSqlMap.order_count;
        const sql = `
      SELECT DATE(updated_at) AS trend_date, ${metric}
      FROM ${TABLE}
      ${whereSql}
      GROUP BY DATE(updated_at)
      ORDER BY trend_date ASC
      LIMIT ${limit}
    `;
        return { sql, values };
    }
    if (tool === "segmentation_tool") {
        const segment = normalizeDimension(input.group_by?.[0] ?? "source_server_id") ?? "source_server_id";
        const metric = metricSqlMap[input.metrics?.[0] ?? "order_count"] ?? metricSqlMap.order_count;
        const sql = `
      SELECT ${segment} AS segment_key, ${metric}
      FROM ${TABLE}
      ${whereSql}
      GROUP BY ${segment}
      ORDER BY segment_key ASC
      LIMIT ${limit}
    `;
        return { sql, values };
    }
    const sql = `
    SELECT source_server_id, order_id, customer_name, amount, status, updated_at, ingest_ts
    FROM ${TABLE}
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
    return { sql, values };
}
