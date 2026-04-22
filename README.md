# Local Flink SQL CDC POC

This project implements a local proof of concept:

`SQL Server CDC -> Flink SQL -> StarRocks`

POC mode is direct landing to StarRocks raw table (`orders_raw`).

## 10-minute quick start
1. Start containers:
   ```powershell
   docker compose up -d
   ```
2. Bootstrap StarRocks tables:
   ```powershell
   Get-Content .\docs\starrocks_bootstrap.sql -Raw | docker exec -i starrocks-fe mysql --protocol=TCP -h 127.0.0.1 -P 9030 -uroot
   ```
3. Update SQL source configs in:
   - `pipelines/dsb/dsb_core_cdc/config/dev.yaml`
   - configure `sqlservers` entries (`srv1`, `srv2`, `srv3`)
4. Install Python dependency:
   ```powershell
   py -m pip install -r orchestrator/requirements.txt
   ```
5. Deploy Flink SQL pipeline:
   ```powershell
   py orchestrator/deploy.py deploy
   ```
6. Check runtime status:
   ```powershell
   py orchestrator/deploy.py status
   ```

StarRocks SQL credentials for this local FE setup:
- username: `root`
- password: empty
- SQL endpoint: `localhost:9030`
- FE HTTP endpoint: `http://localhost:8030`

## Chatbot V2 (UI + Separate Backend + RBAC)
- UI path: `apps/chatbot` (presentation only)
- Backend path: `services/analytics-backend` (skills, tools, policy, GraphQL, StarRocks execution)
- Start backend:
  ```powershell
  cd services/analytics-backend
  npm install
  Copy-Item .env.example .env
  npm run dev
  ```
- Start UI:
  ```powershell
  cd apps/chatbot
  npm install
  Copy-Item .env.example .env.local
  npm run dev
  ```
- Open: `http://localhost:3001`
- Detailed test steps: [Chatbot Test Runbook](/C:/Users/caw-dev/Desktop/data_lake/docs/05_chatbot_test_runbook.md)

## Project docs
- [Architecture Flow](/C:/Users/caw-dev/Desktop/data_lake/docs/01_architecture_flow.md)
- [Repository Structure](/C:/Users/caw-dev/Desktop/data_lake/docs/02_repo_structure.md)
- [Execution Runbook](/C:/Users/caw-dev/Desktop/data_lake/docs/03_execution_runbook.md)
- [Code Flow Walkthrough](/C:/Users/caw-dev/Desktop/data_lake/docs/04_code_flow_walkthrough.md)
- [Chatbot Test Runbook](/C:/Users/caw-dev/Desktop/data_lake/docs/05_chatbot_test_runbook.md)
- [Chatbot V2 Architecture](/C:/Users/caw-dev/Desktop/data_lake/docs/06_chatbot_v2_architecture.md)

## Core paths
- Pipeline SQL: `pipelines/dsb/dsb_core_cdc/sql/`
- Runtime config: `pipelines/dsb/dsb_core_cdc/config/dev.yaml`
- Orchestrator: `orchestrator/deploy.py`
- Schema contracts: `contracts/*.yaml`

## Multi-server pattern
- One Flink job reads 3 SQL Server CDC sources (`srv1`, `srv2`, `srv3`)
- Data lands in one StarRocks table `orders_raw`
- Composite key for isolation: `(source_server_id, order_id)`
