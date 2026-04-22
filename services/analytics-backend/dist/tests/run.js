import { buildQuery } from "../tools/queryBuilder.js";
const user = {
    userId: "u_analyst1",
    role: "analyst_srv1",
    scopes: ["srv1"],
};
const input = {
    intent: "overview",
    group_by: ["source_server_id"],
    metrics: ["order_count", "total_amount"],
    limit: 20,
};
const built = buildQuery("overview_tool", input, user);
if (!built.sql.toLowerCase().includes("source_server_id")) {
    throw new Error("Expected source_server_id in SQL");
}
if (!built.sql.toLowerCase().includes("limit 20")) {
    throw new Error("Expected limit in SQL");
}
// eslint-disable-next-line no-console
console.log("analytics-backend test passed");
