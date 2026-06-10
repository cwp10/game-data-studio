import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { validateRows, type ColumnSpec } from "../../validation/index.js";
import { ok } from "./respond.js";

export function registerValidateHandlers(server: McpServer) {
  server.tool(
    "validate_table",
    "테이블 행 데이터를 컬럼 제약(min/max/required/unique)으로 검증해 위반 목록 반환",
    { table_id: z.string() },
    async ({ table_id }) => {
      const specs: ColumnSpec[] = listColumns(table_id).map((c) => ({
        name: c.name,
        type: c.type,
        constraints: c.constraints ?? undefined,
      }));
      const rows = readRows(table_id).map((r) => ({ id: r.id, data: r.data }));
      return ok(validateRows(rows, specs));
    }
  );
}
