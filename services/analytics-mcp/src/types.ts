export type DirectToolInput = {
  intent: string;
  filters?: Array<{ field: string; value: string }>;
  group_by?: string[];
  metrics?: string[];
  time_range?: { from?: string; to?: string };
  limit?: number;
};

export type BackendChatResponse = {
  answer_text: string;
  tool_selected: string;
  tool_input: Record<string, unknown>;
  tool_output: {
    dataset: Array<Record<string, unknown>>;
    semantic_summary: string;
    visual_hint: "table" | "bar" | "line";
    policy_decision: {
      allow: boolean;
      reason: string;
      applied_scopes: string[];
      blocked_fields: string[];
    };
    query_id: string;
  };
  render_spec: unknown;
  meta: Record<string, unknown>;
};

export type BackendPlanResponse = {
  tool_selected: "overview_tool" | "trends_tool" | "segmentation_tool" | "drilldown_tool";
  tool_input: {
    intent: string;
    filters?: Record<string, string | number | boolean>;
    group_by?: string[];
    metrics?: string[];
    time_range?: { from?: string; to?: string };
    limit?: number;
  };
  policy_decision: {
    allow: boolean;
    reason: string;
    applied_scopes: string[];
    blocked_fields: string[];
  };
  meta: {
    model_mode: "stub" | "live";
    model_provider: "openai" | "claude" | "gemini" | "none";
    fallback_used: boolean;
    latency_ms: number;
    request_id: string;
  };
};

export type GraphqlToolResponse = {
  answer_text: string;
  tool_selected: string;
  visual_hint: string;
  dataset_json: string;
  query_id: string;
  policy_allow: boolean;
  policy_reason: string;
};
