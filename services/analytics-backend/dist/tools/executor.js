import { randomUUID } from "node:crypto";
import { runStarRocksQuery } from "../db/starrocks.js";
import { chooseVisualHint } from "../render/buildRenderSpec.js";
import { buildQuery } from "./queryBuilder.js";
export async function executeTool(input) {
    const queryId = randomUUID();
    const { sql, values } = buildQuery(input.tool, input.toolInput, input.user);
    const dataset = await runStarRocksQuery(sql, values);
    const columns = dataset.length > 0 ? Object.keys(dataset[0]) : [];
    const visualHint = chooseVisualHint(columns, dataset.length);
    const output = {
        dataset: dataset,
        semantic_summary: summarize(input.tool, dataset.length),
        visual_hint: visualHint,
        policy_decision: input.policyDecision,
        query_id: queryId,
    };
    return { output, sql, columns };
}
function summarize(tool, rows) {
    if (tool === "overview_tool")
        return `Overview analytics generated (${rows} rows).`;
    if (tool === "trends_tool")
        return `Trend analysis generated (${rows} points).`;
    if (tool === "segmentation_tool")
        return `Segmentation analysis generated (${rows} groups).`;
    return `Drilldown detail generated (${rows} rows).`;
}
