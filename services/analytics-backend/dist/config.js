import "dotenv/config";
export const cfg = {
    backendPort: Number(process.env.BACKEND_PORT ?? "4000"),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
    modelMode: (process.env.MODEL_MODE ?? "stub"),
    primaryProvider: (process.env.PRIMARY_MODEL_PROVIDER ?? "gemini"),
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.2",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    maxQueryRows: Number(process.env.MAX_QUERY_ROWS ?? "500"),
    queryTimeoutMs: Number(process.env.QUERY_TIMEOUT_MS ?? "15000"),
    postgres: {
        host: process.env.POSTGRES_HOST ?? "localhost",
        port: Number(process.env.POSTGRES_PORT ?? "5433"),
        database: process.env.POSTGRES_DB ?? "postgres",
        user: process.env.POSTGRES_USER ?? "postgres",
        password: process.env.POSTGRES_PASSWORD ?? "postgres",
    },
    starrocks: {
        host: process.env.STARROCKS_HOST ?? "localhost",
        port: Number(process.env.STARROCKS_PORT ?? "9030"),
        database: process.env.STARROCKS_DATABASE ?? "mbs_analytics",
        user: process.env.STARROCKS_USER ?? "root",
        password: process.env.STARROCKS_PASSWORD ?? "",
    },
};
