import { createTable, deleteTable, listTables } from "../../db/repo/tables.js";
import { addColumn, listColumns, removeColumn } from "../../db/repo/columns.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

export function registerTableHandlers(server: { tool: ToolReg }) {
  server.tool(
    "list_tables",
    "프로젝트 내 테이블 목록",
    { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
    (args) => ok(listTables(args.project_id as string))
  );

  server.tool(
    "create_table",
    "테이블 생성 (컬럼 정의 포함 가능)",
    {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, type: { type: "string" }, description: { type: "string" } },
          },
        },
      },
      required: ["project_id", "name"],
    },
    (args) => {
      const table = createTable({
        project_id: args.project_id as string,
        name: args.name as string,
        description: args.description as string | undefined,
      });
      const cols = (args.columns as Array<{ name: string; type: string; description?: string }>) ?? [];
      const createdCols = cols.map((c, i) =>
        addColumn({ table_id: table.id, name: c.name, type: c.type as "string" | "number" | "boolean", description: c.description, order_index: i })
      );
      return ok({ table, columns: createdCols });
    }
  );

  server.tool(
    "delete_table",
    "테이블 삭제",
    { type: "object", properties: { table_id: { type: "string" } }, required: ["table_id"] },
    (args) => { deleteTable(args.table_id as string); return ok({ deleted: true }); }
  );

  server.tool(
    "add_column",
    "컬럼 추가",
    {
      type: "object",
      properties: {
        table_id: { type: "string" },
        name: { type: "string" },
        type: { type: "string", enum: ["string", "number", "boolean"] },
        description: { type: "string" },
      },
      required: ["table_id", "name", "type"],
    },
    (args) => {
      const cols = listColumns(args.table_id as string);
      const col = addColumn({
        table_id: args.table_id as string,
        name: args.name as string,
        type: args.type as "string" | "number" | "boolean",
        description: args.description as string | undefined,
        order_index: cols.length,
      });
      return ok(col);
    }
  );

  server.tool(
    "remove_column",
    "컬럼 삭제",
    { type: "object", properties: { column_id: { type: "string" } }, required: ["column_id"] },
    (args) => { removeColumn(args.column_id as string); return ok({ deleted: true }); }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
