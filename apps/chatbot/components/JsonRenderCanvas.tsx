"use client";

import { Component, useMemo } from "react";

type Props = {
  spec: any;
};

type Row = Record<string, unknown>;
type NormalizedSpec = {
  version: string;
  root: {
    component: "ResultPanel";
    props: {
      chartType: "table" | "bar" | "line";
      columns: string[];
      rows: Row[];
    };
  };
};

class RendererErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="kv">Render spec is invalid for json-render. Please retry the query.</div>;
    }
    return this.props.children;
  }
}

function valueOf(row: Row, key: string): unknown {
  return row[key] ?? null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function renderSimpleLine(columns: string[], rows: Row[]) {
  const x = columns.find((c) => /date|time|updated_at|ingest/i.test(c));
  const y = columns.find((c) => toNumber(rows[0]?.[c]) !== null);
  if (!x || !y || rows.length < 2) {
    return <div className="kv">Line chart needs one time-like + one numeric column.</div>;
  }

  const width = 760;
  const height = 200;
  const margin = { left: 56, right: 16, top: 16, bottom: 36 };
  const points = rows.slice(0, 40).map((row, i) => ({ x: i, y: toNumber(row[y]) ?? 0, label: String(row[x]) }));
  const minY = Math.min(...points.map((p) => p.y), 0);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const yRange = Math.max(maxY - minY, 1);
  const yTicks = [minY, minY + yRange / 2, maxY];

  const xPos = (idx: number) => margin.left + (idx / Math.max(points.length - 1, 1)) * plotWidth;
  const yPos = (val: number) => margin.top + plotHeight - ((val - minY) / yRange) * plotHeight;

  const poly = points.map((p) => `${xPos(p.x)},${yPos(p.y)}`).join(" ");

  const xFirst = points[0]?.label ?? "";
  const xMid = points[Math.floor((points.length - 1) / 2)]?.label ?? "";
  const xLast = points[points.length - 1]?.label ?? "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="spark" role="img" aria-label="line chart">
      <line x1={margin.left} y1={margin.top + plotHeight} x2={width - margin.right} y2={margin.top + plotHeight} stroke="#94a8a3" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="#94a8a3" />
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={margin.left} y1={yPos(t)} x2={width - margin.right} y2={yPos(t)} stroke="#e1ebe8" />
          <text x={8} y={yPos(t) + 4} fontSize="10" fill="#5a6b68">
            {t.toFixed(0)}
          </text>
        </g>
      ))}
      <polyline fill="none" stroke="#0e7a6d" strokeWidth="3" points={poly} />
      {points.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={xPos(p.x)} cy={yPos(p.y)} r="2.5" fill="#0e7a6d" />
      ))}
      <text x={margin.left} y={height - 8} fontSize="10" fill="#5a6b68">
        {xFirst}
      </text>
      <text x={margin.left + plotWidth / 2 - 24} y={height - 8} fontSize="10" fill="#5a6b68">
        {xMid}
      </text>
      <text x={width - margin.right - 80} y={height - 8} fontSize="10" fill="#5a6b68">
        {xLast}
      </text>
      <text x={width / 2 - 30} y={height - 20} fontSize="10" fill="#5a6b68">
        {x}
      </text>
      <text transform={`translate(12 ${height / 2}) rotate(-90)`} fontSize="10" fill="#5a6b68">
        {y}
      </text>
    </svg>
  );
}

function ResultPanel({ props }: { props: { chartType: string; columns: string[]; rows: Row[] } }) {
  const { chartType, columns, rows } = props;

  if (!rows.length) {
    return <div className="kv">No rows returned.</div>;
  }

  if (chartType === "bar") {
    const cat = columns[0];
    const metric = columns.find((c) => toNumber(rows[0][c]) !== null) ?? columns[1];
    const subset = rows.slice(0, 20);
    const maxVal = Math.max(...subset.map((r) => toNumber(valueOf(r, metric)) ?? 0), 1);

    return (
      <div className="bar-wrap">
        {subset.map((r, idx) => {
          const label = String(valueOf(r, cat));
          const val = toNumber(valueOf(r, metric)) ?? 0;
          const width = Math.max(2, (val / maxVal) * 100);
          return (
            <div className="bar-row" key={`${label}-${idx}`}>
              <div>{label}</div>
              <div className="bar">
                <span style={{ width: `${width}%` }} />
              </div>
              <div>{val.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === "line") {
    return renderSimpleLine(columns, rows);
  }

  return (
    <table>
      <thead>
        <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.slice(0, 100).map((r, idx) => (
          <tr key={idx}>{columns.map((c) => <td key={`${idx}-${c}`}>{String(valueOf(r, c))}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function normalizeSpec(spec: unknown): NormalizedSpec | null {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return null;
  const obj = spec as Record<string, unknown>;

  const root = obj.root as Record<string, unknown> | undefined;
  if (root && root.component === "ResultPanel" && root.props && typeof root.props === "object" && !Array.isArray(root.props)) {
    const props = root.props as Record<string, unknown>;
    const chartType = props.chartType;
    const columns = props.columns;
    const rows = props.rows;
    const isChartType = chartType === "table" || chartType === "bar" || chartType === "line";
    if (isChartType && Array.isArray(columns) && Array.isArray(rows)) {
      return {
        version: typeof obj.version === "string" ? obj.version : "1.0",
        root: {
          component: "ResultPanel",
          props: {
            chartType,
            columns: columns.filter((c): c is string => typeof c === "string"),
            rows: rows.filter((r): r is Row => typeof r === "object" && r !== null && !Array.isArray(r)),
          },
        },
      };
    }
  }

  const chartType = obj.chartType;
  const columns = obj.columns;
  const rows = obj.rows;
  const isChartType = chartType === "table" || chartType === "bar" || chartType === "line";
  if (isChartType && Array.isArray(columns) && Array.isArray(rows)) {
    return {
      version: "1.0",
      root: {
        component: "ResultPanel",
        props: {
          chartType,
          columns: columns.filter((c): c is string => typeof c === "string"),
          rows: rows.filter((r): r is Row => typeof r === "object" && r !== null && !Array.isArray(r)),
        },
      },
    };
  }

  return null;
}

export default function JsonRenderCanvas({ spec }: Props) {
  const safeSpec = useMemo(() => normalizeSpec(spec), [spec]);

  if (!safeSpec) {
    return <div className="kv">No valid render spec returned for visualization.</div>;
  }

  return (
    <RendererErrorBoundary>
      <ResultPanel props={safeSpec.root.props} />
    </RendererErrorBoundary>
  );
}
