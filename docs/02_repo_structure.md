# Repository Structure

## Top-level folders
- `pipelines/`: Domain-oriented Flink SQL pipelines.
- `orchestrator/`: Python wrapper for deploy/status/restart/stop.
- `contracts/`: Schema contracts and type mappings for source-to-target alignment.
- `docs/`: Architecture, runbook, and code-flow documentation.
- `runtime/`: Rendered SQL, local Flink state, and StarRocks local data.
- `connectors/`: External connector jars mounted into Flink containers.

## Pipeline layout
- `pipelines/dsb/dsb_core_cdc/sql/00_sources/`: SQL Server CDC source DDLs.
- `pipelines/dsb/dsb_core_cdc/sql/10_silver/`: reserved for future curated transforms (not executed in current POC).
- `pipelines/dsb/dsb_core_cdc/sql/20_gold/`: reserved for future business projections (not executed in current POC).
- `pipelines/dsb/dsb_core_cdc/sql/90_sinks/`: StarRocks raw sink DDLs and direct INSERT jobs.
- `pipelines/dsb/dsb_core_cdc/config/dev.yaml`: runtime and template variables.

## Naming conventions
- SQL files are prefixed with execution order numbers (`001_`, `101_`, `201_`, `901_`).
- Domain job naming pattern: `<domain>_<purpose>` (example: `dsb_core_cdc`).
- Contracts use `<table>_contract.yaml`.
- Environment config files follow `<env>.yaml` (`dev.yaml`, `uat.yaml`, `prod.yaml`).
