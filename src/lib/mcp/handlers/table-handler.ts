import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTable, deleteTable, listTables } from "../../db/repo/tables.js";
import { addColumn, listColumns, removeColumn, updateColumn } from "../../db/repo/columns.js";
import { ok } from "./respond.js";

export function registerTableHandlers(server: McpServer) {
  // ── Tables ──
  server.tool(
    "list_tables",
    "프로젝트 내 테이블 목록",
    { project_id: z.string() },
    async ({ project_id }) => ok(listTables(project_id))
  );

  server.tool(
    "create_table",
    "테이블 생성 (컬럼 정의 포함 가능)",
    {
      project_id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      columns: z.array(z.object({ name: z.string(), type: z.enum(["string", "number", "boolean"]), description: z.string().optional() })).optional(),
    },
    async ({ project_id, name, description, columns }) => {
      const table = createTable({ project_id, name, description }); // id 컬럼 자동 생성됨
      const provided = (columns ?? []).filter((c) => c.name.toLowerCase() !== "id");
      const cols = provided.map((c, i) =>
        addColumn({ table_id: table.id, name: c.name, type: c.type, description: c.description, order_index: i + 1 })
      );
      return ok({ table, columns: cols });
    }
  );

  server.tool(
    "delete_table",
    "테이블 삭제",
    { table_id: z.string() },
    async ({ table_id }) => { deleteTable(table_id); return ok({ deleted: true }); }
  );

  // ── Columns ──
  server.tool(
    "add_column",
    "컬럼 추가. type='enum'이면 enum_type_id(enum_types.id) 필수",
    { table_id: z.string(), name: z.string(), type: z.enum(["string", "number", "boolean", "enum"]), description: z.string().optional(), enum_type_id: z.string().optional() },
    async ({ table_id, name, type, description, enum_type_id }) => {
      const existing = listColumns(table_id);
      return ok(addColumn({ table_id, name, type, description, enum_type_id, order_index: existing.length }));
    }
  );

  server.tool(
    "update_column",
    "컬럼 수정. 이름 변경 시 모든 행의 데이터 키도 함께 변경됨. type='enum'이면 enum_type_id 필요",
    { column_id: z.string(), name: z.string().optional(), type: z.enum(["string", "number", "boolean", "enum"]).optional(), enum_type_id: z.string().optional(), description: z.string().optional() },
    async ({ column_id, name, type, enum_type_id, description }) => ok(updateColumn(column_id, { name, type, enum_type_id, description }))
  );

  server.tool(
    "remove_column",
    "컬럼 삭제",
    { column_id: z.string() },
    async ({ column_id }) => { removeColumn(column_id); return ok({ deleted: true }); }
  );
}
