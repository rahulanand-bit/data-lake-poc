import "dotenv/config";

import { z } from "zod";

const configSchema = z.object({
  ANALYTICS_BACKEND_URL: z.string().url().default("http://localhost:4000"),
  ANALYTICS_DEFAULT_USER_ID: z.string().min(1).default("u_admin"),
  ANALYTICS_DEFAULT_ROLE: z.string().optional(),
  ANALYTICS_MCP_LOG_LEVEL: z.enum(["debug", "info", "error"]).default("info"),
  ANALYTICS_MCP_MODE: z.enum(["skill_plan_execute", "legacy_direct"]).default("skill_plan_execute"),
  ANALYTICS_MCP_WARN_ON_ASK_ANALYTICS: z
    .string()
    .optional()
    .transform((value) => (value ?? "true").toLowerCase() !== "false"),
});

const parsed = configSchema.parse({
  ANALYTICS_BACKEND_URL: process.env.ANALYTICS_BACKEND_URL,
  ANALYTICS_DEFAULT_USER_ID: process.env.ANALYTICS_DEFAULT_USER_ID,
  ANALYTICS_DEFAULT_ROLE: process.env.ANALYTICS_DEFAULT_ROLE,
  ANALYTICS_MCP_LOG_LEVEL: process.env.ANALYTICS_MCP_LOG_LEVEL,
  ANALYTICS_MCP_MODE: process.env.ANALYTICS_MCP_MODE,
  ANALYTICS_MCP_WARN_ON_ASK_ANALYTICS: process.env.ANALYTICS_MCP_WARN_ON_ASK_ANALYTICS,
});

export const cfg = {
  backendUrl: parsed.ANALYTICS_BACKEND_URL,
  defaultUserId: parsed.ANALYTICS_DEFAULT_USER_ID,
  defaultRole: parsed.ANALYTICS_DEFAULT_ROLE || undefined,
  logLevel: parsed.ANALYTICS_MCP_LOG_LEVEL,
  mode: parsed.ANALYTICS_MCP_MODE,
  warnOnAskAnalytics: parsed.ANALYTICS_MCP_WARN_ON_ASK_ANALYTICS,
};

export function logInfo(message: string, data?: Record<string, unknown>): void {
  if (cfg.logLevel === "debug" || cfg.logLevel === "info") {
    // eslint-disable-next-line no-console
    console.error(`[analytics-mcp] ${message}${data ? ` ${JSON.stringify(data)}` : ""}`);
  }
}

export function logDebug(message: string, data?: Record<string, unknown>): void {
  if (cfg.logLevel === "debug") {
    // eslint-disable-next-line no-console
    console.error(`[analytics-mcp:debug] ${message}${data ? ` ${JSON.stringify(data)}` : ""}`);
  }
}
