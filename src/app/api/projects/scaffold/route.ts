import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/db/repo/projects";
import { createTable } from "@/lib/db/repo/tables";
import { addColumn } from "@/lib/db/repo/columns";
import { upsertRow } from "@/lib/db/repo/rows";
import { createEnumType } from "@/lib/db/repo/enumTypes";
import { setRelation } from "@/lib/db/repo/relations";
import { SEED_TEMPLATES, type SeedTable } from "@/lib/genre-seeds";

interface PlanColumn { name: string; type?: string; description?: string; enum_type_name?: string }
interface PlanTable { name: string; description?: string; columns?: PlanColumn[]; rows?: Record<string, unknown>[] }
interface EnumTypeDef { name: string; values?: string[] }
interface RelationDef { from_table: string; from_column: string; to_table: string; to_column: string }

const TYPES = new Set(["string", "number", "boolean", "enum"]);

function applyColumns(tableId: string, columns: Array<{ name: string; type: string; description?: string; enum_type_name?: string }>, enumTypeMap: Record<string, string> = {}) {
  columns
    .filter((c) => c?.name?.trim() && c.name.trim().toLowerCase() !== "id")
    .forEach((c, i) => {
      try {
        const enumTypeId = c.type === "enum" && c.enum_type_name ? (enumTypeMap[c.enum_type_name] ?? null) : null;
        const finalType = enumTypeId ? "enum" : ((TYPES.has(c.type ?? "") ? c.type : "string") as "string" | "number" | "boolean" | "enum");
        addColumn({
          table_id: tableId,
          name: c.name.trim(),
          type: finalType,
          description: c.description,
          order_index: i + 1,
          enum_type_id: enumTypeId,
        });
      } catch { /* 중복 컬럼 무시 */ }
    });
}

export async function POST(req: NextRequest) {
  const { name, genre, description, tables, genreCodes, enumTypes, relations } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = createProject({ name: name.trim(), genre, description });

  // enum 타입 먼저 생성 (테이블 컬럼에서 참조할 수 있도록)
  const enumTypeMap: Record<string, string> = {};
  if (Array.isArray(enumTypes)) {
    for (const et of enumTypes as EnumTypeDef[]) {
      if (!et?.name?.trim()) continue;
      try {
        const created = createEnumType({ project_id: project.id, name: et.name.trim(), values: et.values ?? [] });
        enumTypeMap[et.name.trim()] = created.id;
      } catch { /* 동일 이름 중복 시 무시 */ }
    }
  }

  if (Array.isArray(genreCodes) && genreCodes.length > 0) {
    // 장르 코드 기반: seed templates 병합 (테이블명 기준 중복 제거)
    const merged = new Map<string, SeedTable>();
    for (const code of genreCodes as string[]) {
      for (const t of SEED_TEMPLATES[code] ?? []) {
        if (!merged.has(t.name)) merged.set(t.name, t);
      }
    }
    for (const t of merged.values()) {
      const table = createTable({ project_id: project.id, name: t.name });
      applyColumns(table.id, t.columns);
    }
  } else {
    // 기존 플랜 기반 (AI wizard 경로 호환)
    const tableNameToId = new Map<string, string>();
    for (const t of (tables ?? []) as PlanTable[]) {
      if (!t?.name?.trim()) continue;
      const table = createTable({ project_id: project.id, name: t.name.trim(), description: t.description });
      tableNameToId.set(t.name.trim(), table.id);
      applyColumns(table.id, (t.columns ?? []).map((c) => ({ name: c.name ?? "", type: c.type ?? "string", description: c.description, enum_type_name: c.enum_type_name })), enumTypeMap);
      if (Array.isArray(t.rows)) {
        for (const row of t.rows) {
          if (row && typeof row === "object") {
            try { upsertRow(table.id, undefined, row); } catch { /* 중복·제약 무시 */ }
          }
        }
      }
    }

    // 모든 테이블 생성 후 relations 생성 (AI wizard 경로 한정)
    if (Array.isArray(relations)) {
      for (const r of relations as RelationDef[]) {
        const fromId = tableNameToId.get(r?.from_table);
        const toId = tableNameToId.get(r?.to_table);
        if (!fromId || !toId || !r?.from_column || !r?.to_column) continue;
        try {
          setRelation({
            project_id: project.id,
            from_table_id: fromId,
            from_column: r.from_column,
            to_table_id: toId,
            to_column: r.to_column,
          });
        } catch { /* 중복 등 무시 */ }
      }
    }
  }

  return NextResponse.json(project, { status: 201 });
}
