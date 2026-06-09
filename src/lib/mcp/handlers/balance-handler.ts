import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

interface AnomalyResult {
  column: string;
  mean: number;
  stddev: number;
  min: number;
  max: number;
  anomalies: Array<{ row_id: string; value: number; z_score: number; severity: "danger" | "warn" }>;
}

export function registerBalanceHandlers(server: { tool: ToolReg }) {
  server.tool(
    "analyze_balance",
    "선택 컬럼 통계 계산 및 이상값 감지",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        columns: { type: "array", items: { type: "string" } },
        group_by: { type: "string", description: "등급 등 그룹 컬럼명 (선택)" },
      },
      required: ["table_id"],
    },
    (args) => {
      const tableId = args.table_id as string;
      const targetCols = (args.columns as string[] | undefined) ?? listColumns(tableId).filter((c) => c.type === "number").map((c) => c.name);
      const groupBy = args.group_by as string | undefined;
      const rows = readRows(tableId);

      const results: AnomalyResult[] = [];

      for (const col of targetCols) {
        const groups: Record<string, Array<{ row_id: string; value: number }>> = {};
        for (const row of rows) {
          const raw = row.data[col];
          if (typeof raw !== "number") continue;
          const group = groupBy ? String(row.data[groupBy] ?? "_all") : "_all";
          if (!groups[group]) groups[group] = [];
          groups[group].push({ row_id: row.id, value: raw });
        }

        for (const [group, vals] of Object.entries(groups)) {
          if (vals.length < 2) continue;
          const nums = vals.map((v) => v.value);
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
          const stddev = Math.sqrt(variance);
          const min = Math.min(...nums);
          const max = Math.max(...nums);

          const anomalies = vals
            .map((v) => ({ ...v, z_score: stddev > 0 ? Math.abs(v.value - mean) / stddev : 0 }))
            .filter((v) => v.z_score > 2)
            .map((v) => ({ ...v, severity: (v.z_score > 3 ? "danger" : "warn") as "danger" | "warn" }));

          results.push({ column: groupBy ? `${col} [${group}]` : col, mean, stddev, min, max, anomalies });
        }
      }

      const total_anomalies = results.reduce((a, r) => a + r.anomalies.length, 0);
      return ok({ results, total_anomalies });
    }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
