import { NextRequest, NextResponse } from "next/server";
import { listRelations } from "@/lib/db/repo/relations";
import { readRows, getRow } from "@/lib/db/repo/rows";
import { findReferencingRows, type RelationSpec, type RowsByTable } from "@/lib/validation/fk";

// 삭제 대상 행들을 참조하는 행 조회 (delete 경고용, 읽기 전용 — 삭제 안 함).
export async function POST(req: NextRequest) {
  const { project_id, table_id, row_ids } = await req.json();
  if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  if (!table_id) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  if (!Array.isArray(row_ids)) return NextResponse.json({ error: "row_ids required" }, { status: 400 });

  const relations: RelationSpec[] = listRelations(project_id).map((r) => ({
    from_table_id: r.from_table_id,
    from_column: r.from_column,
    to_table_id: r.to_table_id,
    to_column: r.to_column,
  }));

  // table_id를 가리키는(to_table_id === table_id) relation의 from_table만 조회하면 충분.
  const tableIds = new Set<string>();
  for (const rel of relations) {
    if (rel.to_table_id === table_id) tableIds.add(rel.from_table_id);
  }

  const rowsByTable: RowsByTable = {};
  for (const tid of tableIds) {
    rowsByTable[tid] = readRows(tid).map((r) => ({ id: r.id, data: r.data }));
  }

  const referencing = (row_ids as string[]).map((row_id) => {
    const target = getRow(row_id);
    const refs = target
      ? findReferencingRows(table_id, { id: target.id, data: target.data }, relations, rowsByTable)
      : [];
    return { row_id, refs };
  });

  return NextResponse.json({ referencing });
}
