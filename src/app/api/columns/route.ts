import { NextRequest, NextResponse } from "next/server";
import { addColumn, listColumns, removeColumn, updateColumn, reorderColumns } from "@/lib/db/repo/columns";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("table_id");
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  return NextResponse.json(listColumns(tableId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const existing = listColumns(body.table_id);
  const col = addColumn({ ...body, order_index: existing.length });
  return NextResponse.json(col, { status: 201 });
}

// 컬럼 수정 또는 순서 변경
export async function PUT(req: NextRequest) {
  const body = await req.json();
  try {
    if (body.action === "reorder") {
      if (!body.table_id || !Array.isArray(body.ordered_ids)) return NextResponse.json({ error: "table_id, ordered_ids required" }, { status: 400 });
      reorderColumns(body.table_id, body.ordered_ids);
      return NextResponse.json({ reordered: true });
    }
    const { column_id, name, type, enum_type_id, description } = body;
    if (!column_id) return NextResponse.json({ error: "column_id required" }, { status: 400 });
    return NextResponse.json(updateColumn(column_id, { name, type, enum_type_id, description }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { column_id } = await req.json();
  removeColumn(column_id);
  return NextResponse.json({ deleted: true });
}
