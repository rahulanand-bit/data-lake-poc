import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { analyticsHealth, askAnalytics, planAnalytics, runDirectTool } from "./backendClient.js";
import { cfg, logInfo } from "./config.js";
import type { BackendPlanResponse, DirectToolInput, GraphqlToolResponse } from "./types.js";

const directInputSchema = z.object({
  intent: z.string().min(1),
  filters: z.array(z.object({ field: z.string().min(1), value: z.string().min(1) })).optional(),
  group_by: z.array(z.string().min(1)).optional(),
  metrics: z.array(z.string().min(1)).optional(),
  time_range: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const server = new McpServer({
  name: "analytics-mcp",
  version: "0.1.0",
});

function textResult(text: string, structuredContent?: unknown) {
  const normalized =
    structuredContent && typeof structuredContent === "object" && !Array.isArray(structuredContent)
      ? (structuredContent as Record<string, unknown>)
      : undefined;

  return {
    content: [{ type: "text" as const, text }],
    structuredContent: normalized,
  };
}

function normalizeFilterValue(value: string | number | boolean): string {
  if (typeof value === "string") return value;
  return String(value);
}

function toDirectInputFromPlan(toolInput: BackendPlanResponse["tool_input"]): DirectToolInput {
  const filters = toolInput.filters
    ? Object.entries(toolInput.filters).map(([field, value]) => ({
        field,
        value: normalizeFilterValue(value),
      }))
    : undefined;

  return {
    intent: toolInput.intent,
    filters,
    group_by: toolInput.group_by,
    metrics: toolInput.metrics,
    time_range: toolInput.time_range,
    limit: toolInput.limit,
  };
}

function toDirectToolName(tool: BackendPlanResponse["tool_selected"]): "overview" | "trends" | "segmentation" | "drilldown" {
  if (tool === "overview_tool") return "overview";
  if (tool === "trends_tool") return "trends";
  if (tool === "segmentation_tool") return "segmentation";
  return "drilldown";
}

server.registerTool(
  "analytics_health",
  {
    description: "Check analytics backend health.",
  },
  async () => {
    const health = await analyticsHealth();
    return textResult(`Analytics backend health: ${JSON.stringify(health)}`, health);
  },
);

server.registerTool(
  "ask_analytics",
  {
    description: "Ask a natural-language analytics question through backend skill+tools.",
    inputSchema: {
      message: z.string().min(1),
      role: z.string().optional(),
    },
  },
  async ({ message, role }) => {
    if (cfg.mode === "legacy_direct") {
      const response = await askAnalytics(message, role);
      return textResult(
        [
          `Answer: ${response.answer_text}`,
          `Tool: ${response.tool_selected}`,
          `Policy: ${response.tool_output.policy_decision.allow ? "ALLOW" : "DENY"} (${response.tool_output.policy_decision.reason})`,
          `Rows: ${response.tool_output.dataset.length}`,
        ].join("\n"),
        {
          ...response,
          meta: {
            ...(response.meta as Record<string, unknown>),
            execution_path: "backend_nl_skill",
            skill_used: true,
          },
        },
      );
    }

    const plan = await planAnalytics(message, role);
    if (!plan.policy_decision.allow) {
      return textResult(
        [
          `Answer: Access denied`,
          `Planned tool: ${plan.tool_selected}`,
          `Policy: DENY (${plan.policy_decision.reason})`,
        ].join("\n"),
        {
          answer_text: `Access denied: ${plan.policy_decision.reason}`,
          tool_selected: plan.tool_selected,
          tool_input: plan.tool_input,
          tool_output: {
            dataset: [],
            visual_hint: "table",
            policy_decision: plan.policy_decision,
            query_id: "denied",
          },
          render_spec: {
            version: "1.0",
            root: {
              component: "ResultPanel",
              props: {
                chartType: "table",
                columns: [],
                rows: [],
              },
            },
          },
          meta: {
            ...plan.meta,
            execution_path: "skill_plan_then_direct_tool",
            skill_used: true,
            planner_request_id: plan.meta.request_id,
          },
        },
      );
    }

    const directTool = toDirectToolName(plan.tool_selected);
    const directInput = toDirectInputFromPlan(plan.tool_input);
    const directResponse = await runDirectTool(directTool, directInput, role);
    const payload = toMachinePayload(directResponse);

    const rows = payload.tool_output.dataset;
    const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
    const warning =
      cfg.warnOnAskAnalytics
        ? "This response used skill planning + direct tool execution. For explicit control, call overview/trends/segmentation/drilldown directly."
        : undefined;

    const combined = {
      answer_text: payload.answer_text,
      tool_selected: payload.tool_selected,
      tool_input: plan.tool_input,
      tool_output: {
        ...payload.tool_output,
        policy_decision: plan.policy_decision,
      },
      render_spec: {
        version: "1.0",
        root: {
          component: "ResultPanel",
          props: {
            chartType: payload.tool_output.visual_hint,
            columns,
            rows,
          },
        },
      },
      planner: plan,
      meta: {
        ...plan.meta,
        execution_path: "skill_plan_then_direct_tool",
        skill_used: true,
        planner_request_id: plan.meta.request_id,
        warning,
      },
    };

    return textResult(
      [
        `Answer: ${combined.answer_text}`,
        `Planned tool: ${plan.tool_selected}`,
        `Executed tool: ${directResponse.tool_selected}`,
        `Policy: ${plan.policy_decision.allow ? "ALLOW" : "DENY"} (${plan.policy_decision.reason})`,
        `Rows: ${rows.length}`,
        ...(warning ? [`Warning: ${warning}`] : []),
      ].join("\n"),
      combined,
    );
  },
);

server.registerTool(
  "overview",
  {
    description: "Run overview analytics tool with structured input.",
    inputSchema: {
      input: directInputSchema,
      role: z.string().optional(),
    },
  },
  async ({ input, role }) => runDirectToolResponse("overview", input, role),
);

server.registerTool(
  "trends",
  {
    description: "Run trends analytics tool with structured input.",
    inputSchema: {
      input: directInputSchema,
      role: z.string().optional(),
    },
  },
  async ({ input, role }) => runDirectToolResponse("trends", input, role),
);

server.registerTool(
  "segmentation",
  {
    description: "Run segmentation analytics tool with structured input.",
    inputSchema: {
      input: directInputSchema,
      role: z.string().optional(),
    },
  },
  async ({ input, role }) => runDirectToolResponse("segmentation", input, role),
);

server.registerTool(
  "drilldown",
  {
    description: "Run drilldown analytics tool with structured input.",
    inputSchema: {
      input: directInputSchema,
      role: z.string().optional(),
    },
  },
  async ({ input, role }) => runDirectToolResponse("drilldown", input, role),
);

function parseDataset(datasetJson: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(datasetJson) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>>;
    }
  } catch {
    // no-op, return empty dataset
  }
  return [];
}

function toMachinePayload(response: GraphqlToolResponse) {
  return {
    answer_text: response.answer_text,
    tool_selected: response.tool_selected,
    query_id: response.query_id,
    policy: {
      allow: response.policy_allow,
      reason: response.policy_reason,
    },
    tool_output: {
      dataset: parseDataset(response.dataset_json),
      visual_hint: response.visual_hint,
    },
    meta: {
      source: "analytics-mcp",
      response_type: "direct_tool",
    },
  };
}

async function runDirectToolResponse(
  tool: "overview" | "trends" | "segmentation" | "drilldown",
  input: DirectToolInput,
  role?: string,
) {
  const response = await runDirectTool(tool, input, role);
  const payload = toMachinePayload(response);
  return textResult(
    [
      `Answer: ${response.answer_text}`,
      `Tool: ${response.tool_selected}`,
      `Policy: ${response.policy_allow ? "ALLOW" : "DENY"} (${response.policy_reason})`,
      `Query ID: ${response.query_id}`,
      `Rows: ${payload.tool_output.dataset.length}`,
    ].join("\n"),
    payload,
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logInfo("analytics-mcp started", {
    backend_url: cfg.backendUrl,
    default_user_id: cfg.defaultUserId,
    default_role: cfg.defaultRole ?? null,
    mode: cfg.mode,
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[analytics-mcp] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
