import { deleteRow, readRows, upsertRow } from "../../db/repo/rows.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

export function registerRowHandlers(server: { tool: ToolReg }) {
  server.tool(
    "read_rows",
    "행 조회. 페이징 지원",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: ["table_id"],
    },
    (args) => ok(readRows(args.table_id as string, { limit: args.limit as number, offset: args.offset as number }))
  );

  server.tool(
    "upsert_row",
    "행 삽입 또는 수정",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        id: { type: "string" },
        data: { type: "object" },
      },
      required: ["table_id", "data"],
    },
    (args) => ok(upsertRow(args.table_id as string, args.id as string | undefined, args.data as Record<string, unknown>))
  );

  server.tool(
    "delete_row",
    "행 삭제",
    { type: "object", properties: { row_id: { type: "string" } }, required: ["row_id"] },
    (args) => { deleteRow(args.row_id as string); return ok({ deleted: true }); }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
