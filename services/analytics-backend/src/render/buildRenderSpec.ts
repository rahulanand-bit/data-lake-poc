type Row = Record<string, unknown>;

export function chooseVisualHint(columns: string[], rowCount: number): "table" | "bar" | "line" {
  const hasDate = columns.some((c) => /date|time|updated_at|trend_date/i.test(c));
  const hasNumeric = columns.some((c) => /(count|amount|avg|max|min)/i.test(c));
  if (hasDate && hasNumeric) return "line";
  if (columns.length >= 2 && hasNumeric) return "bar";
  if (rowCount <= 1) return "bar";
  return "table";
}

export function buildRenderSpec(visualHint: "table" | "bar" | "line", columns: string[], rows: Row[]) {
  return {
    version: "1.0",
    root: {
      component: "ResultPanel",
      props: {
        chartType: visualHint,
        columns,
        rows,
      },
    },
  };
}
