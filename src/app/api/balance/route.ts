import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";

export async function POST(req: NextRequest) {
  const { table_id, columns, group_by } = await req.json();
  const targetCols = columns ?? listColumns(table_id).filter((c: { type: string }) => c.type === "number").map((c: { name: string }) => c.name);
  const rows = readRows(table_id);
  const results = [];

  for (const col of targetCols) {
    const groups: Record<string, Array<{ row_id: string; value: number }>> = {};
    for (const row of rows) {
      const raw = row.data[col];
      if (typeof raw !== "number") continue;
      const group = group_by ? String(row.data[group_by] ?? "_all") : "_all";
      (groups[group] ??= []).push({ row_id: row.id, value: raw });
    }
    for (const [group, vals] of Object.entries(groups)) {
      if (vals.length < 2) continue;
      const nums = vals.map((v) => v.value);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const stddev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      const anomalies = vals
        .map((v) => ({ ...v, z_score: stddev > 0 ? Math.abs(v.value - mean) / stddev : 0 }))
        .filter((v) => v.z_score > 2)
        .map((v) => ({ ...v, severity: v.z_score > 3 ? "danger" : "warn" }));
      results.push({ column: group_by ? `${col} [${group}]` : col, mean, stddev, min: Math.min(...nums), max: Math.max(...nums), anomalies });
    }
  }
  return NextResponse.json({ results, total_anomalies: results.reduce((a, r) => a + r.anomalies.length, 0) });
}
