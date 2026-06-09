// 컬럼 통계 + z-score 기반 이상값 감지 (API 라우트와 MCP 핸들러 공용)
export interface AnalyzeRow {
  id: string;
  data: Record<string, unknown>;
}

export interface Anomaly {
  row_id: string;
  label: string;
  value: number;
  z_score: number;
  severity: "danger" | "warn";
}

export interface ColumnResult {
  column: string;
  mean: number;
  stddev: number;
  min: number;
  max: number;
  anomalies: Anomaly[];
}

export interface AnalyzeOutput {
  results: ColumnResult[];
  total_anomalies: number;
}

// z-score > 3 → danger, 2~3 → warn. group_by 지정 시 그룹별로 통계 산출.
export function analyzeColumns(rows: AnalyzeRow[], targetColumns: string[], groupBy?: string): AnalyzeOutput {
  const results: ColumnResult[] = [];

  for (const col of targetColumns) {
    const groups: Record<string, Array<{ row_id: string; label: string; value: number }>> = {};
    for (const row of rows) {
      const raw = row.data[col];
      if (typeof raw !== "number") continue;
      const group = groupBy ? String(row.data[groupBy] ?? "_all") : "_all";
      const label = String(row.data.name ?? row.data.id ?? row.id);
      (groups[group] ??= []).push({ row_id: row.id, label, value: raw });
    }

    for (const [group, vals] of Object.entries(groups)) {
      if (vals.length < 2) continue;
      const nums = vals.map((v) => v.value);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const stddev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      const anomalies: Anomaly[] = vals
        .map((v) => ({ ...v, z_score: stddev > 0 ? Math.abs(v.value - mean) / stddev : 0 }))
        .filter((v) => v.z_score > 2)
        .map((v) => ({ ...v, severity: v.z_score > 3 ? ("danger" as const) : ("warn" as const) }));
      results.push({ column: groupBy ? `${col} [${group}]` : col, mean, stddev, min: Math.min(...nums), max: Math.max(...nums), anomalies });
    }
  }

  return { results, total_anomalies: results.reduce((a, r) => a + r.anomalies.length, 0) };
}
