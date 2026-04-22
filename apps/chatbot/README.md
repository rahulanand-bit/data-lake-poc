# MBS Chatbot UI (V2)

Presentation-only Next.js app for Analytics Chatbot V2.

## Responsibilities
- Collect user query, `user_id`, and optional role.
- Call backend REST endpoint `/chat/query`.
- Render backend-provided `render_spec` via json-render.
- Show selected tool and policy decision metadata.

## Setup
1. `cd apps/chatbot`
2. `npm install`
3. `Copy-Item .env.example .env.local`
4. Ensure `NEXT_PUBLIC_ANALYTICS_BACKEND_URL` points to backend (default `http://localhost:4000`).

## Run
- `npm run dev`
- Open [http://localhost:3001](http://localhost:3001)

## Notes
- UI does not connect to StarRocks directly.
- UI does not generate or execute SQL.
- All policy and tool decisions are backend-owned.
