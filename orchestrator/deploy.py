#!/usr/bin/env python3
import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILE_PATTERN = re.compile(r".*_([A-Za-z0-9_-]+)\.sql$")


def load_config(config_path: Path) -> dict:
    with config_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def list_sql_files(sql_root: Path, run_order: list[str]) -> list[Path]:
    sql_files: list[Path] = []
    for section in run_order:
        section_path = sql_root / section
        if not section_path.exists():
            continue
        sql_files.extend(sorted(section_path.glob("*.sql")))
    return sql_files


def render_template(content: str, template_vars: dict) -> str:
    rendered = content
    for key, value in template_vars.items():
        rendered = rendered.replace("{{" + key + "}}", str(value))
    return rendered


def source_vars_by_id(config: dict) -> dict[str, dict]:
    sqlservers = config.get("sqlservers", [])
    if not sqlservers:
        raise RuntimeError("No sqlservers configured in config file.")

    source_map: dict[str, dict] = {}
    for source in sqlservers:
        source_id = source.get("source_server_id")
        if not source_id:
            raise RuntimeError("Each sqlservers entry must include source_server_id.")
        if source_id in source_map:
            raise RuntimeError(f"Duplicate source_server_id found: {source_id}")
        source_map[source_id] = source
    return source_map


def build_source_template_vars(source: dict) -> dict:
    return {
        "SQLSERVER_HOST": source["host"],
        "SQLSERVER_PORT": str(source["port"]),
        "SQLSERVER_USERNAME": source["username"],
        "SQLSERVER_PASSWORD": str(source["password"]),
        "SQLSERVER_DATABASE": source["database"],
        "SQLSERVER_SCHEMA": source["schema"],
        "SQLSERVER_TABLE": source["table"],
        "SQLSERVER_SSL": str(source.get("ssl", False)).lower(),
    }


def render_sql_files(sql_files: list[Path], render_dir: Path, template_vars: dict, config: dict) -> list[Path]:
    render_dir.mkdir(parents=True, exist_ok=True)
    rendered_files: list[Path] = []
    source_map = source_vars_by_id(config)
    for source_file in sql_files:
        content = source_file.read_text(encoding="utf-8")
        vars_for_file = dict(template_vars)
        if source_file.parent.name == "00_sources":
            match = SOURCE_FILE_PATTERN.match(source_file.name)
            if not match:
                raise RuntimeError(
                    f"Source SQL file name must end with _<source_server_id>.sql: {source_file.name}"
                )
            source_id = match.group(1)
            if source_id not in source_map:
                raise RuntimeError(
                    f"No sqlservers entry for source_server_id '{source_id}' required by {source_file.name}"
                )
            vars_for_file.update(build_source_template_vars(source_map[source_id]))

        rendered = render_template(content, vars_for_file)
        target_file = render_dir / source_file.name
        target_file.write_text(rendered, encoding="utf-8")
        rendered_files.append(target_file)
    return rendered_files


def run_sql_files(container: str, sql_cmd: str, rendered_files: list[Path], render_dir: Path) -> None:
    connectors_dir = ROOT / "connectors"
    connector_jars = sorted(connectors_dir.glob("*.jar"))
    if not connector_jars:
        raise RuntimeError(
            "No connector jars found in connectors/. Add required jars (sqlserver-cdc, mssql-jdbc, starrocks connector)."
        )

    combined_file = render_dir / "_combined_deploy.sql"
    combined_sql = [
        "SET 'execution.target' = 'remote';",
        "SET 'rest.address' = 'jobmanager';",
        "SET 'rest.port' = '8081';",
        "",
    ]
    for jar in connector_jars:
        combined_sql.append(f"ADD JAR 'file:///opt/flink/connectors/{jar.name}';")
    combined_sql.append("")
    for file_path in rendered_files:
        combined_sql.append(f"-- BEGIN {file_path.name}")
        combined_sql.append(file_path.read_text(encoding="utf-8").rstrip())
        combined_sql.append(f"-- END {file_path.name}")
        combined_sql.append("")
    combined_file.write_text("\n".join(combined_sql), encoding="utf-8")

    container_file = f"/workspace/{render_dir.as_posix()}/{combined_file.name}"
    cmd = [
        "docker",
        "exec",
        container,
        "bash",
        "-lc",
        f"{sql_cmd} -f {container_file}",
    ]
    print(f"[deploy] Executing combined SQL script ({len(rendered_files)} files)")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed while executing combined SQL script\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    if "ERROR" in result.stdout.upper() or "EXCEPTION" in result.stdout.upper():
        raise RuntimeError(f"Flink SQL reported an error:\n{result.stdout}")


def docker_ps() -> str:
    cmd = ["docker", "ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return f"Docker status unavailable.\n{result.stderr}"
    return result.stdout.strip()


def flink_jobs_overview(rest_url: str) -> dict:
    req = urllib.request.Request(f"{rest_url}/jobs/overview", method="GET")
    with urllib.request.urlopen(req, timeout=10) as response:
        data = response.read().decode("utf-8")
    return json.loads(data)


def cancel_job(rest_url: str, job_id: str) -> None:
    req = urllib.request.Request(
        f"{rest_url}/jobs/{job_id}?mode=cancel",
        data=b"{}",
        method="PATCH",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10):
        pass


def append_metadata(metadata_file: Path, payload: dict) -> None:
    metadata_file.parent.mkdir(parents=True, exist_ok=True)
    with metadata_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload) + "\n")


def checksum(files: list[Path]) -> str:
    sha = hashlib.sha256()
    for f in files:
        sha.update(f.read_bytes())
    return sha.hexdigest()


def cmd_deploy(config: dict) -> None:
    job = config["job"]
    sql_root = ROOT / job["sql_root"]
    run_order = job["run_order"]
    template_vars = dict(config.get("template_vars", {}))

    runtime_cfg = config["runtime"]
    render_dir = ROOT / runtime_cfg["rendered_sql_dir"]
    metadata_file = ROOT / runtime_cfg["metadata_file"]

    sql_files = list_sql_files(sql_root, run_order)
    if not sql_files:
        raise RuntimeError(f"No SQL files found under {sql_root}")

    rendered_files = render_sql_files(sql_files, render_dir, template_vars, config)
    run_sql_files(
        config["flink"]["sql_client_container"],
        config["flink"]["sql_client_command"],
        rendered_files,
        Path(runtime_cfg["rendered_sql_dir"]),
    )

    payload = {
        "timestamp_utc": dt.datetime.now(tz=dt.timezone.utc).isoformat(),
        "job_name": job["name"],
        "version": job["version"],
        "domain": job["domain"],
        "sql_checksum": checksum(rendered_files),
        "file_count": len(rendered_files),
        "source_count": len(config.get("sqlservers", [])),
        "status": "deployed",
    }
    append_metadata(metadata_file, payload)
    print(json.dumps(payload, indent=2))


def cmd_status(config: dict) -> None:
    print("[status] Docker containers")
    print(docker_ps())
    print("\n[status] Flink jobs overview")
    rest_url = config["flink"]["rest_url"]
    try:
        print(json.dumps(flink_jobs_overview(rest_url), indent=2))
    except urllib.error.URLError as exc:
        print(f"Flink REST unavailable at {rest_url}: {exc}")


def cmd_stop(config: dict) -> None:
    rest_url = config["flink"]["rest_url"]
    try:
        jobs = flink_jobs_overview(rest_url).get("jobs", [])
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Flink REST unavailable at {rest_url}: {exc}") from exc

    running = [j for j in jobs if j.get("state") in {"RUNNING", "RESTARTING", "CREATED"}]
    for job in running:
        job_id = job["jid"]
        print(f"[stop] Cancelling job {job_id}")
        cancel_job(rest_url, job_id)

    print(f"[stop] Cancelled {len(running)} running job(s).")


def cmd_restart(config: dict) -> None:
    cmd_stop(config)
    cmd_deploy(config)


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy and operate Flink SQL pipelines.")
    parser.add_argument(
        "--config",
        default="pipelines/dsb/dsb_core_cdc/config/dev.yaml",
        help="Path to environment config file.",
    )
    parser.add_argument("command", choices=["deploy", "status", "restart", "stop"])
    args = parser.parse_args()

    config_path = ROOT / args.config
    if not config_path.exists():
        print(f"Config file not found: {config_path}", file=sys.stderr)
        return 1

    config = load_config(config_path)
    try:
        if args.command == "deploy":
            cmd_deploy(config)
        elif args.command == "status":
            cmd_status(config)
        elif args.command == "restart":
            cmd_restart(config)
        elif args.command == "stop":
            cmd_stop(config)
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
