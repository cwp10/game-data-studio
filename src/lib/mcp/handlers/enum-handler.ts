import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listEnumTypes, createEnumType, updateEnumType, deleteEnumType } from "../../db/repo/enumTypes.js";
import { countColumnsUsingEnum } from "../../db/repo/columns.js";
import { ok } from "./respond.js";

export function registerEnumHandlers(server: McpServer) {
  server.tool(
    "list_enum_types",
    "프로젝트의 재사용 enum 타입 목록 (예: Grade=[SSR,SR,R,N])",
    { project_id: z.string() },
    async ({ project_id }) => ok(listEnumTypes(project_id))
  );

  server.tool(
    "create_enum_type",
    "재사용 enum 타입 생성. 이후 add_column(type='enum', enum_type_id=...)로 컬럼에 연결",
    { project_id: z.string(), name: z.string(), values: z.array(z.string()) },
    async ({ project_id, name, values }) => ok(createEnumType({ project_id, name, values }))
  );

  server.tool(
    "update_enum_type",
    "enum 타입의 이름 또는 허용값 갱신 (참조 중인 모든 컬럼에 반영)",
    { id: z.string(), name: z.string().optional(), values: z.array(z.string()).optional() },
    async ({ id, name, values }) => ok(updateEnumType(id, { name, values }))
  );

  server.tool(
    "delete_enum_type",
    "enum 타입 삭제. 사용 중인 컬럼이 있으면 거부됨",
    { id: z.string() },
    async ({ id }) => {
      const used = countColumnsUsingEnum(id);
      if (used > 0) throw new Error(`이 타입을 사용하는 컬럼이 ${used}개 있어 삭제할 수 없습니다.`);
      deleteEnumType(id);
      return ok({ deleted: true });
    }
  );
}
