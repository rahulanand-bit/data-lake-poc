export type ModelMode = "stub" | "live";
export type ModelProvider = "openai" | "claude" | "gemini";
export type ToolName = "overview_tool" | "trends_tool" | "segmentation_tool" | "drilldown_tool";

export type ToolInput = {
  intent: string;
  filters?: Record<string, string | number | boolean>;
  group_by?: string[];
  metrics?: string[];
  time_range?: { from?: string; to?: string };
  limit?: number;
};

export type PolicyDecision = {
  allow: boolean;
  reason: string;
  applied_scopes: string[];
  blocked_fields: string[];
};

export type ToolOutput = {
  dataset: Array<Record<string, string | number | boolean | null>>;
  semantic_summary: string;
  visual_hint: "table" | "bar" | "line";
  policy_decision: PolicyDecision;
  query_id: string;
};

export type ChatRequest = {
  message: string;
  user_id: string;
  role?: string;
};

export type ChatResponse = {
  answer_text: string;
  tool_selected: ToolName;
  tool_input: ToolInput;
  tool_output: ToolOutput;
  render_spec: unknown;
  meta: {
    model_mode: ModelMode;
    model_provider: ModelProvider | "none";
    fallback_used: boolean;
    latency_ms: number;
  };
};

export type UserContext = {
  userId: string;
  role: string;
  scopes: string[];
};
