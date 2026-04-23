import cors from "cors";
import express from "express";
import { graphql } from "graphql";
import { z } from "zod";
import { runChatPlan, runChatQuery } from "./chatService.js";
import { cfg } from "./config.js";
import { schema } from "./graphql/schema.js";
const app = express();
app.use(cors({ origin: cfg.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
const chatSchema = z.object({
    message: z.string().min(1),
    user_id: z.string().min(1),
    role: z.string().optional(),
});
app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        service: "analytics-backend",
        model_mode: cfg.modelMode,
        primary_provider: cfg.primaryProvider,
    });
});
app.post("/chat/query", async (req, res) => {
    try {
        const payload = chatSchema.parse(req.body);
        const response = await runChatQuery(payload);
        res.json(response);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown backend error";
        const status = /denied|missing|unknown|inactive|not allowed|not assigned/i.test(message) ? 403 : 400;
        res.status(status).json({ error: message });
    }
});
app.post("/chat/plan", async (req, res) => {
    try {
        const payload = chatSchema.parse(req.body);
        const response = await runChatPlan(payload);
        res.json(response);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown backend error";
        const status = /denied|missing|unknown|inactive|not allowed|not assigned/i.test(message) ? 403 : 400;
        res.status(status).json({ error: message });
    }
});
app.post("/graphql", async (req, res) => {
    try {
        const query = String(req.body?.query ?? "");
        const variables = req.body?.variables ?? {};
        const result = await graphql({
            schema,
            source: query,
            variableValues: variables,
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ errors: [{ message: err instanceof Error ? err.message : "GraphQL error" }] });
    }
});
app.listen(cfg.backendPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[analytics-backend] listening on http://localhost:${cfg.backendPort}`);
});
