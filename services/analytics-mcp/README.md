# Analytics MCP Wrapper

MCP wrapper that exposes `services/analytics-backend` as Codex tools.

## Tools exposed
- `analytics_health()`
- `ask_analytics(message, role?)`
- `overview(input, role?)`
- `trends(input, role?)`
- `segmentation(input, role?)`
- `drilldown(input, role?)`

## Environment
Copy `.env.example` to `.env` and update as needed:
- `ANALYTICS_BACKEND_URL` default: `http://localhost:4000`
- `ANALYTICS_DEFAULT_USER_ID` default: `u_admin`
- `ANALYTICS_DEFAULT_ROLE` optional
- `ANALYTICS_MCP_LOG_LEVEL` default: `info`
- `ANALYTICS_MCP_MODE` default: `skill_plan_execute` (`legacy_direct` optional)
- `ANALYTICS_MCP_WARN_ON_ASK_ANALYTICS` default: `true`

## ask_analytics execution modes
- `skill_plan_execute` (default): `ask_analytics` calls backend `POST /chat/plan` (skill only), then executes the selected direct tool (`overview/trends/segmentation/drilldown`) through GraphQL.
- `legacy_direct`: `ask_analytics` calls backend `POST /chat/query` directly (legacy behavior).

## Run locally
```powershell
cd services\analytics-mcp
npm install
Copy-Item .env.example .env
npm run build
```

## Codex registration
Add this MCP server entry to your Codex config (`%USERPROFILE%\.codex\config.toml`):

```toml
[mcp_servers.analytics_mcp]
command = "node"
args = ["C:\\Users\\caw-dev\\Desktop\\data_lake\\services\\analytics-mcp\\dist\\index.js"]
```

If you prefer dev mode, use:
```toml
[mcp_servers.analytics_mcp]
command = "npm.cmd"
args = ["run", "dev"]
cwd = "C:\\Users\\caw-dev\\Desktop\\data_lake\\services\\analytics-mcp"
```

Then restart Codex app.

## Example prompts in Codex chat
- `Use analytics_health`
- `Use ask_analytics with message "total amount by source_server_id"`
- `Use trends with input intent=time_series, metrics=[order_count], group_by=[date], limit=30`
