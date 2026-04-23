import { randomUUID } from "node:crypto";

import { z } from "zod";

import { cfg, logDebug, logInfo } from "./config.js";
import type { BackendChatResponse, BackendPlanResponse, DirectToolInput, GraphqlToolResponse } from "./types.js";

type ToolName = "overview" | "trends" | "segmentation" | "drilldown";

const chatResponseSchema = z.object({
  answer_text: z.string(),
  tool_selected: z.string(),
  tool_input: z.record(z.unknown()),
  tool_output: z.object({
    dataset: z.array(z.record(z.unknown())),
    semantic_summary: z.string(),
    visual_hint: z.enum(["table", "bar", "line"]),
    policy_decision: z.object({
      allow: z.boolean(),
      reason: z.string(),
      applied_scopes: z.array(z.string()),
      blocked_fields: z.array(z.string()),
    }),
    query_id: z.string(),
  }),
  render_spec: z.unknown(),
  meta: z.record(z.unknown()),
});

function getUserContext(role?: string): { user_id: string; role?: string } {
  return {
    user_id: cfg.defaultUserId,
    role: role ?? cfg.defaultRole,
  };
}

async function callJson<T>(input: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  correlationId: string;
}): Promise<T> {
  const started = Date.now();
  const method = input.method ?? "POST";
  const url = `${cfg.backendUrl}${input.path}`;

  logDebug("backend_request", { method, url, correlationId: input.correlationId });

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-correlation-id": input.correlationId,
    },
    body: method === "GET" ? undefined : JSON.stringify(input.body ?? {}),
  });

  const latencyMs = Date.now() - started;
  const text = await res.text();
  let json: unknown = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Backend returned non-JSON response (${res.status}): ${text.slice(0, 400)}`);
  }

  logInfo("backend_response", {
    path: input.path,
    status: res.status,
    latency_ms: latencyMs,
    correlation_id: input.correlationId,
  });

  if (!res.ok) {
    const err = json as { error?: string; errors?: Array<{ message?: string }> };
    const message = err.error ?? err.errors?.[0]?.message ?? `Backend request failed with status ${res.status}`;
    throw new Error(`Backend error (${res.status}): ${message}`);
  }

  return json as T;
}

export async function analyticsHealth(): Promise<Record<string, unknown>> {
  const correlationId = randomUUID();
  return callJson<Record<string, unknown>>({
    path: "/health",
    method: "GET",
    correlationId,
  });
}

export async function askAnalytics(message: string, role?: string): Promise<BackendChatResponse> {
  const correlationId = randomUUID();
  const payload = {
    message,
    ...getUserContext(role),
  };

  const json = await callJson<unknown>({
    path: "/chat/query",
    method: "POST",
    body: payload,
    correlationId,
  });

  return chatResponseSchema.parse(json) as BackendChatResponse;
}

const planResponseSchema = z.object({
  tool_selected: z.enum(["overview_tool", "trends_tool", "segmentation_tool", "drilldown_tool"]),
  tool_input: z.object({
    intent: z.string(),
    filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    group_by: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional(),
    time_range: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
    limit: z.number().optional(),
  }),
  policy_decision: z.object({
    allow: z.boolean(),
    reason: z.string(),
    applied_scopes: z.array(z.string()),
    blocked_fields: z.array(z.string()),
  }),
  meta: z.object({
    model_mode: z.enum(["stub", "live"]),
    model_provider: z.enum(["openai", "claude", "gemini", "none"]),
    fallback_used: z.boolean(),
    latency_ms: z.number(),
    request_id: z.string(),
  }),
});

export async function planAnalytics(message: string, role?: string): Promise<BackendPlanResponse> {
  const correlationId = randomUUID();
  const payload = {
    message,
    ...getUserContext(role),
  };

  const json = await callJson<unknown>({
    path: "/chat/plan",
    method: "POST",
    body: payload,
    correlationId,
  });

  return planResponseSchema.parse(json) as BackendPlanResponse;
}

export async function runDirectTool(tool: ToolName, input: DirectToolInput, role?: string): Promise<GraphqlToolResponse> {
  const correlationId = randomUUID();
  const query = `
    query RunTool($user_id: String!, $role: String, $input: ToolInputArg!) {
      ${tool}(user_id: $user_id, role: $role, input: $input) {
        answer_text
        tool_selected
        visual_hint
        dataset_json
        query_id
        policy_allow
        policy_reason
      }
    }
  `;

  const variables = {
    ...getUserContext(role),
    input,
  };

  const json = await callJson<{ data?: Record<string, unknown>; errors?: Array<{ message?: string }> }>({
    path: "/graphql",
    method: "POST",
    body: { query, variables },
    correlationId,
  });

  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors[0]?.message ?? "Unknown GraphQL error"}`);
  }

  const toolPayload = json.data?.[tool];
  if (!toolPayload || typeof toolPayload !== "object") {
    throw new Error(`GraphQL tool response missing for ${tool}`);
  }

  return toolPayload as GraphqlToolResponse;
}
