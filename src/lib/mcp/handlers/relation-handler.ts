import { deleteRelation, listRelations, setRelation } from "../../db/repo/relations.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

export function registerRelationHandlers(server: { tool: ToolReg }) {
  server.tool(
    "list_relations",
    "프로젝트 내 전체 관계 목록",
    { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
    (args) => ok(listRelations(args.project_id as string))
  );

  server.tool(
    "set_relation",
    "테이블 간 FK 관계 설정",
    {
      type: "object",
      properties: {
        project_id: { type: "string" },
        from_table_id: { type: "string" },
        from_column: { type: "string" },
        to_table_id: { type: "string" },
        to_column: { type: "string" },
      },
      required: ["project_id", "from_table_id", "from_column", "to_table_id", "to_column"],
    },
    (args) =>
      ok(
        setRelation({
          project_id: args.project_id as string,
          from_table_id: args.from_table_id as string,
          from_column: args.from_column as string,
          to_table_id: args.to_table_id as string,
          to_column: args.to_column as string,
        })
      )
  );

  server.tool(
    "delete_relation",
    "관계 삭제",
    { type: "object", properties: { relation_id: { type: "string" } }, required: ["relation_id"] },
    (args) => { deleteRelation(args.relation_id as string); return ok({ deleted: true }); }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
