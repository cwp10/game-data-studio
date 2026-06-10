import { NextRequest, NextResponse } from "next/server";
import { listRelations } from "@/lib/db/repo/relations";
import { readRows } from "@/lib/db/repo/rows";
import { findBrokenRefs, type RelationSpec, type RowsByTable } from "@/lib/validation/fk";

// 프로젝트 전체 깨진 FK 참조 검출 (읽기 전용).
export async function POST(req: NextRequest) {
  const { project_id } = await req.json();
  if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const relations: RelationSpec[] = listRelations(project_id).map((r) => ({
    from_table_id: r.from_table_id,
    from_column: r.from_column,
    to_table_id: r.to_table_id,
    to_column: r.to_column,
  }));
  if (!relations.length) return NextResponse.json({ broken: [] });

  const tableIds = new Set<string>();
  for (const rel of relations) {
    tableIds.add(rel.from_table_id);
    tableIds.add(rel.to_table_id);
  }

  const rowsByTable: RowsByTable = {};
  for (const tid of tableIds) {
    rowsByTable[tid] = readRows(tid).map((r) => ({ id: r.id, data: r.data }));
  }

  return NextResponse.json({ broken: findBrokenRefs(relations, rowsByTable) });
}
