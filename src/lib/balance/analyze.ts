// 컬럼 통계 + MAD 기반 이상값 감지 (API 라우트와 MCP 핸들러 공용)
// modified z-score = 0.6745 × |xi − median| / MAD — 소표본에서 z-score보다 강건.
export interface AnalyzeRow {
  id: string;
  data: Record<string, unknown>;
}

export interface Anomaly {
  row_id: string;
  label: string;
  value: number;
  z_score: number;       // modified z-score 값 (이름은 하위 호환 유지)
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

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// modified z-score > 3.5 → danger, 2.5~3.5 → warn. group_by 지정 시 그룹별 통계 산출.
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

      // 기존 통계 (UI 표시용)
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const stddev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      const min = Math.min(...nums);
      const max = Math.max(...nums);

      // MAD modified z-score 이상값 감지
      const sorted = [...nums].sort((a, b) => a - b);
      const med = median(sorted);
      const absDevs = sorted.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
      const mad = median(absDevs);

      const anomalies: Anomaly[] = vals
        .map((v) => ({
          ...v,
          z_score: mad > 0 ? 0.6745 * Math.abs(v.value - med) / mad : 0,
        }))
        .filter((v) => v.z_score > 2.5)
        .map((v) => ({ ...v, severity: v.z_score > 3.5 ? ("danger" as const) : ("warn" as const) }));

      results.push({ column: groupBy ? `${col} [${group}]` : col, mean, stddev, min, max, anomalies });
    }
  }

  return { results, total_anomalies: results.reduce((a, r) => a + r.anomalies.length, 0) };
}
