"use client";

import { useState } from "react";
import JsonRenderCanvas from "@/components/JsonRenderCanvas";

type ApiResponse = {
  answer_text: string;
  tool_selected: "overview_tool" | "trends_tool" | "segmentation_tool" | "drilldown_tool";
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
  meta: {
    model_mode: "stub" | "live";
    model_provider: "openai" | "claude" | "gemini" | "none";
    fallback_used: boolean;
    latency_ms: number;
  };
  error?: string;
};

const starterQuestions = [
  "Show top 10 latest orders by updated_at",
  "Total amount by source_server_id",
  "Show order count trend by updated_at date",
];

export default function Page() {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [userId, setUserId] = useState("u_admin");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const backend = process.env.NEXT_PUBLIC_ANALYTICS_BACKEND_URL ?? "http://localhost:4000";
      const res = await fetch(`${backend}/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, user_id: userId, role: role || undefined }),
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>MBS StarRocks Analytics Chatbot</h1>
      <p className="kv">UI-only frontend: message to analytics backend skill+tools+RBAC, then json-render visualization</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id (e.g. u_admin)" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="role override (optional)" />
        </div>
        <div className="row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
          {starterQuestions.map((q) => (
            <button key={q} type="button" onClick={() => setQuestion(q)} style={{ background: "#e8eeec", color: "#13211f" }}>
              {q}
            </button>
          ))}
        </div>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" onClick={ask} disabled={loading || !question.trim() || !userId.trim()}>
            {loading ? "Asking..." : "Ask"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e6b8b8", background: "#fff3f3" }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {result ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Answer</h3>
          <p>{result.answer_text}</p>
          <p className="kv">
            Mode: {result.meta.model_mode} | Provider: {result.meta.model_provider} | Fallback: {String(result.meta.fallback_used)} | Latency: {result.meta.latency_ms} ms
          </p>
          <p className="kv">Tool: {result.tool_selected} | Query ID: {result.tool_output.query_id}</p>
          <p className="kv">
            Policy: {result.tool_output.policy_decision.allow ? "ALLOW" : "DENY"} | {result.tool_output.policy_decision.reason}
          </p>
          <JsonRenderCanvas spec={result.render_spec} />
        </div>
      ) : null}
    </main>
  );
}
