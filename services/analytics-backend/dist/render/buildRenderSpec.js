export function chooseVisualHint(columns, rowCount) {
    const hasDate = columns.some((c) => /date|time|updated_at|trend_date/i.test(c));
    const hasNumeric = columns.some((c) => /(count|amount|avg|max|min)/i.test(c));
    if (hasDate && hasNumeric)
        return "line";
    if (columns.length >= 2 && hasNumeric)
        return "bar";
    if (rowCount <= 1)
        return "bar";
    return "table";
}
export function buildRenderSpec(visualHint, columns, rows) {
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
