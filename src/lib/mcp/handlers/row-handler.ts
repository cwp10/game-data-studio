import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { deleteRow, readRows, upsertRow } from "../../db/repo/rows.js";
import { ok } from "./respond.js";

export function registerRowHandlers(server: McpServer) {
  server.tool(
    "read_rows",
    "행 조회. 페이징 지원",
    { table_id: z.string(), limit: z.number().optional(), offset: z.number().optional() },
    async ({ table_id, limit, offset }) => ok(readRows(table_id, { limit, offset }))
  );

  server.tool(
    "upsert_row",
    "행 삽입 또는 수정",
    { table_id: z.string(), id: z.string().optional(), data: z.record(z.unknown()) },
    async ({ table_id, id, data }) => ok(upsertRow(table_id, id, data as Record<string, unknown>))
  );

  server.tool(
    "delete_row",
    "행 삭제",
    { row_id: z.string() },
    async ({ row_id }) => { deleteRow(row_id); return ok({ deleted: true }); }
  );
}
