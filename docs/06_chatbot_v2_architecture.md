# Chatbot V2 Architecture

```mermaid
flowchart LR
  U["User (Browser)"] --> UI["Next.js UI (apps/chatbot)\nPresentation only"]
  UI --> REST["POST /chat/query\nservices/analytics-backend"]
  REST --> SKILL["Skill Router\nanalytics_assistant"]
  SKILL --> MODEL["Model Adapter\nstub/live (Gemini/OpenAI/Claude)"]
  MODEL --> TOOLS["Tool Selector\noverview/trends/segmentation/drilldown"]
  TOOLS --> POLICY["Policy Engine\nRBAC + Row Scope + Field Access"]
  POLICY -->|allow| GQL["GraphQL Gateway\nTool-aligned operations"]
  POLICY -->|deny| AUDIT["Policy Audit (Postgres)"]
  GQL --> QB["Safe Query Builder\nNo raw SQL from UI"]
  QB --> SR["StarRocks"]
  GQL --> AUDIT
  SR --> GQL --> REST --> UI
  UI --> RENDER["json-render canvas\n(table/bar/line)"]

  RBACDB["Postgres RBAC tables"] --> POLICY
  POLICY --> RBACDB
```

## Separation of concerns
- UI: chat UX + render only.
- Backend: skill orchestration, tool routing, policy, GraphQL, data access.
- Postgres: RBAC and policy audit metadata.
- StarRocks: analytics data.

## Security boundary
- UI cannot execute SQL.
- LLM cannot execute SQL directly.
- Only backend query builder executes constrained SQL after policy allow.
