import OpenAI from "openai";

import { cfg } from "../config.js";
import type { ModelProvider, ToolInput, ToolName } from "../types.js";

type RouterResult = {
  tool: ToolName;
  toolInput: ToolInput;
  provider: ModelProvider | "none";
  fallbackUsed: boolean;
};

const systemPrompt = `You are analytics_assistant planner.
Return strict JSON with shape:
{
  "tool_name": "overview_tool|trends_tool|segmentation_tool|drilldown_tool",
  "tool_input": {
    "intent": "short text",
    "filters": {"source_server_id": "srv1|srv2|srv3", "status": "optional"},
    "group_by": ["source_server_id|status|updated_at|date"],
    "metrics": ["order_count|total_amount|avg_amount|max_amount|min_amount"],
    "time_range": {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"},
    "limit": 100
  }
}
Never output SQL.`;

export async function chooseToolFromMessage(message: string): Promise<RouterResult> {
  if (cfg.modelMode === "stub") {
    return { ...stubSelect(message), provider: "none", fallbackUsed: false };
  }

  const order = providerOrder();
  const errors: string[] = [];

  for (const provider of order) {
    try {
      const result = await callProvider(provider, message);
      return { ...result, provider, fallbackUsed: provider !== cfg.primaryProvider };
    } catch (err) {
      errors.push(`${provider}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  throw new Error(`Unable to generate a safe analytical request from model providers. ${errors.join(" | ")}`);
}

function providerOrder(): ModelProvider[] {
  const all: ModelProvider[] = ["gemini", "openai", "claude"];
  const first = cfg.primaryProvider;
  return [first, ...all.filter((p) => p !== first)];
}

async function callProvider(provider: ModelProvider, message: string): Promise<{ tool: ToolName; toolInput: ToolInput }> {
  if (provider === "openai") return callOpenAI(message);
  if (provider === "gemini") return callGemini(message);
  return callClaude(message);
}

async function callOpenAI(message: string): Promise<{ tool: ToolName; toolInput: ToolInput }> {
  if (!cfg.openaiApiKey) throw new Error("OPENAI_API_KEY is missing");
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const resp = await client.responses.create({
    model: cfg.openaiModel,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tool_call",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            tool_name: {
              type: "string",
              enum: ["overview_tool", "trends_tool", "segmentation_tool", "drilldown_tool"],
            },
            tool_input: {
              type: "object",
              additionalProperties: true,
              properties: {
                intent: { type: "string" },
                filters: { type: "object", additionalProperties: true },
                group_by: { type: "array", items: { type: "string" } },
                metrics: { type: "array", items: { type: "string" } },
                time_range: {
                  type: "object",
                  additionalProperties: false,
                  properties: { from: { type: "string" }, to: { type: "string" } },
                },
                limit: { type: "number" },
              },
              required: ["intent"],
            },
          },
          required: ["tool_name", "tool_input"],
        },
      },
    },
  });

  const raw = resp.output_text;
  const parsed = JSON.parse(raw) as { tool_name: ToolName; tool_input: ToolInput };
  return { tool: parsed.tool_name, toolInput: parsed.tool_input };
}

async function callGemini(message: string): Promise<{ tool: ToolName; toolInput: ToolInput }> {
  if (!cfg.geminiApiKey) throw new Error("GEMINI_API_KEY is missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:generateContent?key=${cfg.geminiApiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser message: ${message}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const data = (await res.json()) as any;
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error("Gemini response had no text");
  const parsed = JSON.parse(txt) as { tool_name: ToolName; tool_input: ToolInput };
  return { tool: parsed.tool_name, toolInput: parsed.tool_input };
}

async function callClaude(message: string): Promise<{ tool: ToolName; toolInput: ToolInput }> {
  if (!cfg.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is missing");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": cfg.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.anthropicModel,
      max_tokens: 400,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });
  if (!res.ok) throw new Error(`Claude request failed: ${res.status}`);
  const data = (await res.json()) as any;
  const txt = data?.content?.[0]?.text;
  if (!txt) throw new Error("Claude response had no text");
  const parsed = JSON.parse(txt) as { tool_name: ToolName; tool_input: ToolInput };
  return { tool: parsed.tool_name, toolInput: parsed.tool_input };
}

function stubSelect(message: string): { tool: ToolName; toolInput: ToolInput } {
  const q = message.toLowerCase();
  const detectServer =
    q.includes("server 1") || q.includes("srv1")
      ? "srv1"
      : q.includes("server 2") || q.includes("srv2")
        ? "srv2"
        : q.includes("server 3") || q.includes("srv3")
          ? "srv3"
          : undefined;

  if (q.includes("trend") || q.includes("over time") || q.includes("daily")) {
    return {
      tool: "trends_tool",
      toolInput: {
        intent: "time_series",
        filters: detectServer ? { source_server_id: detectServer } : undefined,
        metrics: ["order_count"],
        group_by: ["date"],
        limit: 180,
      },
    };
  }

  if (q.includes("segment") || q.includes("by status") || q.includes("by server")) {
    return {
      tool: "segmentation_tool",
      toolInput: {
        intent: "segmentation",
        filters: detectServer ? { source_server_id: detectServer } : undefined,
        group_by: q.includes("status") ? ["status"] : ["source_server_id"],
        metrics: q.includes("amount") ? ["total_amount"] : ["order_count"],
        limit: 100,
      },
    };
  }

  if (q.includes("latest") || q.includes("show orders") || q.includes("details") || q.includes("rows")) {
    return {
      tool: "drilldown_tool",
      toolInput: {
        intent: "drilldown",
        filters: detectServer ? { source_server_id: detectServer } : undefined,
        limit: q.includes("top 10") ? 10 : 100,
      },
    };
  }

  return {
    tool: "overview_tool",
    toolInput: {
      intent: "overview",
      filters: detectServer ? { source_server_id: detectServer } : undefined,
      group_by: ["source_server_id"],
      metrics: q.includes("amount") ? ["total_amount"] : ["order_count"],
      limit: 50,
    },
  };
}
