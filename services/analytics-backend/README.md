# Analytics Backend (Chatbot V2)

Dedicated backend for analytics chatbot with:
- Skill router (`analytics_assistant`)
- Tool execution (`overview`, `trends`, `segmentation`, `drilldown`)
- RBAC + row scopes from Postgres
- GraphQL gateway (tool-aligned operations)
- REST endpoint for UI (`POST /chat/query`)

## Environment

Copy `.env.example` to `.env`.

Important vars:
- `MODEL_MODE=stub|live`
- `PRIMARY_MODEL_PROVIDER=gemini|openai|claude`
- `POSTGRES_*`
- `STARROCKS_*`

## Run

```powershell
cd services\analytics-backend
npm install
npm run dev
```

## Endpoints

- `GET /health`
- `POST /chat/query`
- `POST /graphql`

## RBAC setup

Apply schema:
```powershell
Get-Content .\db\rbac_schema.sql -Raw | docker exec -i analytics-postgres psql -U postgres -d postgres
```


