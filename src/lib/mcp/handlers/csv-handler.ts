import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import path from "path";
import { addColumn, listColumns } from "../../db/repo/columns.js";
import { readRows, upsertRow } from "../../db/repo/rows.js";
import { parseCSV } from "../../util/csv.js";
import { ok } from "./respond.js";

export function registerCsvHandlers(server: McpServer) {
  server.tool(
    "import_csv",
    "로컬 CSV 파일 임포트. 신규 컬럼 자동 추가",
    { table_id: z.string(), file_path: z.string() },
    async ({ table_id, file_path }) => {
      const content = fs.readFileSync(path.resolve(file_path), "utf-8");
      const { headers, rows: dataRows } = parseCSV(content);

      const existingCols = listColumns(table_id);
      const existingNames = new Set(existingCols.map((c) => c.name));
      for (const h of headers) {
        if (!existingNames.has(h)) {
          const sample = dataRows[0]?.[headers.indexOf(h)] ?? "";
          const type = sample !== "" && !isNaN(Number(sample)) ? "number" : "string";
          addColumn({ table_id, name: h, type: type as "string" | "number", order_index: existingCols.length });
        }
      }
      let imported = 0;
      for (const row of dataRows) {
        const data: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const v = row[i] ?? "";
          data[h] = v !== "" && !isNaN(Number(v)) ? Number(v) : v;
        });
        upsertRow(table_id, undefined, data);
        imported++;
      }
      return ok({ imported, headers });
    }
  );

  server.tool(
    "export_csv",
    "테이블을 CSV로 익스포트",
    { table_id: z.string(), output_path: z.string() },
    async ({ table_id, output_path }) => {
      const cols = listColumns(table_id);
      const rows = readRows(table_id);
      const headers = cols.map((c) => c.name);
      const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => String(r.data[h] ?? "")).join(","))];
      const outPath = path.resolve(output_path);
      fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
      return ok({ exported: rows.length, path: outPath });
    }
  );
}
