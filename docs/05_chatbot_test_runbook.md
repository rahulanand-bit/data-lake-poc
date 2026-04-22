# Chatbot V2 Test Runbook

## 1) Prerequisites

1. Flink CDC pipeline is running and writing to StarRocks:
```powershell
py orchestrator\deploy.py status
```

2. StarRocks has data:
```powershell
docker exec starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot -e "SELECT source_server_id, COUNT(*) AS cnt FROM mbs_analytics.orders_raw GROUP BY source_server_id;"
```

3. Postgres is running on port `5433` (from docker compose).

## 2) Initialize RBAC Metadata

Run RBAC schema + seed in Postgres:
```powershell
Get-Content .\services\analytics-backend\db\rbac_schema.sql -Raw | docker exec -i analytics-postgres psql -U postgres -d postgres
```

Seeded test users:
- `u_admin` (role: `admin`)
- `u_analyst1` (role: `analyst_srv1`)
- `u_analyst2` (role: `analyst_srv2`)

## 3) Start Analytics Backend

```powershell
cd services\analytics-backend
npm install
Copy-Item .env.example .env
npm run dev
```

Health check:
```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/health | Select-Object -ExpandProperty Content
```

## 4) Start Chatbot UI

```powershell
cd apps\chatbot
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open: `http://localhost:3001`

## 5) REST API Test (Backend)

```powershell
curl -X POST http://localhost:4000/chat/query `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"total amount by source_server_id\",\"user_id\":\"u_admin\"}"
```

Expected:
- `tool_selected`
- `tool_input`
- `tool_output.policy_decision`
- `render_spec`

## 6) GraphQL Tool Test

```powershell
curl -X POST http://localhost:4000/graphql `
  -H "Content-Type: application/json" `
  -d "{\"query\":\"query($uid:String!){overview(user_id:$uid,input:{intent:\\\"overview\\\",group_by:[\\\"source_server_id\\\"],metrics:[\\\"order_count\\\"]}){answer_text tool_selected visual_hint policy_allow policy_reason}}\",\"variables\":{\"uid\":\"u_admin\"}}"
```

Expected: tool result payload with `policy_allow=true`.

## 7) RBAC Validation Scenarios

1. Admin access:
   - user: `u_admin`
   - ask: `show latest orders`
   - expected: rows across all servers.

2. Scoped analyst:
   - user: `u_analyst1`
   - ask: `show latest orders`
   - expected: only `source_server_id = srv1`.

3. Denied field test:
   - user: `u_analyst1`
   - ask for `customer_name` segmentation
   - expected: policy denial with reason.

## 8) Model Modes

- `MODEL_MODE=stub`: deterministic tool routing, no provider API key needed.
- `MODEL_MODE=live`: uses provider routing (Gemini/OpenAI/Claude) to generate tool-call args.

If live mode fails, response should return meaningful safe-generation error; no static SQL fallback is used.


