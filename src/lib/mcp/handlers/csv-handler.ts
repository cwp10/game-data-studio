import fs from "fs";
import path from "path";
import { addColumn, listColumns } from "../../db/repo/columns.js";
import { upsertRow } from "../../db/repo/rows.js";
import { getTable } from "../../db/repo/tables.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rows };
}

export function registerCsvHandlers(server: { tool: ToolReg }) {
  server.tool(
    "import_csv",
    "로컬 CSV 파일 임포트. 신규 컬럼 자동 추가",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        file_path: { type: "string" },
      },
      required: ["table_id", "file_path"],
    },
    (args) => {
      const tableId = args.table_id as string;
      const filePath = path.resolve(args.file_path as string);
      const content = fs.readFileSync(filePath, "utf-8");
      const { headers, rows } = parseCSV(content);

      const existingCols = listColumns(tableId);
      const existingNames = new Set(existingCols.map((c) => c.name));

      // 신규 컬럼 추가 (타입 추론: 숫자면 number, 나머지 string)
      for (const h of headers) {
        if (!existingNames.has(h)) {
          // 첫 행 샘플로 타입 추론
          const sample = rows[0]?.[headers.indexOf(h)] ?? "";
          const type = sample !== "" && !isNaN(Number(sample)) ? "number" : "string";
          addColumn({ table_id: tableId, name: h, type, order_index: existingCols.length });
        }
      }

      let imported = 0;
      for (const row of rows) {
        const data: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const val = row[i] ?? "";
          data[h] = val !== "" && !isNaN(Number(val)) ? Number(val) : val;
        });
        upsertRow(tableId, undefined, data);
        imported++;
      }

      return ok({ imported, headers });
    }
  );

  server.tool(
    "export_csv",
    "테이블을 CSV로 익스포트",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        output_path: { type: "string" },
      },
      required: ["table_id", "output_path"],
    },
    (args) => {
      const { readRows } = require("../../db/repo/rows.js");
      const tableId = args.table_id as string;
      const table = getTable(tableId);
      if (!table) return err("table not found");

      const cols = listColumns(tableId);
      const rows = readRows(tableId);
      const headers = cols.map((c) => c.name);
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(headers.map((h) => String(row.data[h] ?? "")).join(","));
      }
      const outPath = path.resolve(args.output_path as string);
      fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
      return ok({ exported: rows.length, path: outPath });
    }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
function err(msg: string) {
  return { content: [{ type: "text", text: JSON.stringify({ error: msg }) }], isError: true };
}
