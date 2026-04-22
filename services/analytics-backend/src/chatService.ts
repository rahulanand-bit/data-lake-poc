import { randomUUID } from "node:crypto";

import { cfg } from "./config.js";
import { RbacRepository } from "./db/rbacRepository.js";
import { pgPool } from "./db/postgres.js";
import { PolicyEngine } from "./policy/engine.js";
import { buildRenderSpec } from "./render/buildRenderSpec.js";
import { routeSkill } from "./skill/analyticsAssistant.js";
import { executeTool } from "./tools/executor.js";
import type { ChatRequest, ChatResponse, ToolInput, ToolName } from "./types.js";

const rbacRepository = new RbacRepository(pgPool);
const policyEngine = new PolicyEngine(rbacRepository);

export async function runChatQuery(input: ChatRequest): Promise<ChatResponse> {
  const started = Date.now();
  const requestId = randomUUID();
  const routed = await routeSkill(input.message);
  return runToolRequest({
    user_id: input.user_id,
    role: input.role,
    routed,
    started,
    requestId,
  });
}

export async function runToolRequest(input: {
  user_id: string;
  role?: string;
  routed: {
    tool: ToolName;
    toolInput: ToolInput;
    provider: ChatResponse["meta"]["model_provider"];
    fallbackUsed: boolean;
  };
  started?: number;
  requestId?: string;
}): Promise<ChatResponse> {
  const started = input.started ?? Date.now();
  const requestId = input.requestId ?? randomUUID();
  const user = await rbacRepository.resolveUserContext(input.user_id, input.role);

  const toolPolicy = await policyEngine.authorizeTool(user, input.routed.tool, requestId);
  if (!toolPolicy.allow) {
    return deniedResponse({
      tool: input.routed.tool,
      toolInput: input.routed.toolInput,
      policyReason: toolPolicy.reason,
      latencyMs: Date.now() - started,
      provider: input.routed.provider,
      fallbackUsed: input.routed.fallbackUsed,
    });
  }

  const fieldValidation = await policyEngine.validateInput(user, input.routed.toolInput);
  if (!fieldValidation.decision.allow) {
    await rbacRepository.recordPolicyAudit({
      requestId,
      userId: user.userId,
      role: user.role,
      decision: fieldValidation.decision,
    });
    return deniedResponse({
      tool: input.routed.tool,
      toolInput: input.routed.toolInput,
      policyReason: fieldValidation.decision.reason,
      latencyMs: Date.now() - started,
      provider: input.routed.provider,
      fallbackUsed: input.routed.fallbackUsed,
    });
  }

  const { output, columns } = await executeTool({
    tool: input.routed.tool,
    toolInput: fieldValidation.cleanedInput,
    user,
    policyDecision: {
      ...fieldValidation.decision,
      applied_scopes: user.scopes,
    },
  });

  const render_spec = buildRenderSpec(output.visual_hint, columns, output.dataset);
  return {
    answer_text: output.semantic_summary,
    tool_selected: input.routed.tool,
    tool_input: fieldValidation.cleanedInput,
    tool_output: output,
    render_spec,
    meta: {
      model_mode: cfg.modelMode,
      model_provider: input.routed.provider,
      fallback_used: input.routed.fallbackUsed,
      latency_ms: Date.now() - started,
    },
  };
}

function deniedResponse(input: {
  tool: ToolName;
  toolInput: ToolInput;
  policyReason: string;
  latencyMs: number;
  provider: ChatResponse["meta"]["model_provider"];
  fallbackUsed: boolean;
}): ChatResponse {
  return {
    answer_text: `Access denied: ${input.policyReason}`,
    tool_selected: input.tool,
    tool_input: input.toolInput,
    tool_output: {
      dataset: [],
      semantic_summary: "Request denied by policy engine.",
      visual_hint: "table",
      policy_decision: {
        allow: false,
        reason: input.policyReason,
        applied_scopes: [],
        blocked_fields: [],
      },
      query_id: "denied",
    },
    render_spec: buildRenderSpec("table", [], []),
    meta: {
      model_mode: cfg.modelMode,
      model_provider: input.provider,
      fallback_used: input.fallbackUsed,
      latency_ms: input.latencyMs,
    },
  };
}
