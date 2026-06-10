import { NextRequest, NextResponse } from "next/server";
import {
  listAnnotations,
  listRowAnnotations,
  upsertAnnotation,
  deleteAnnotation,
} from "@/lib/db/repo/annotations";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("table_id");
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  const rowId = req.nextUrl.searchParams.get("row_id");
  try {
    const result = rowId ? listRowAnnotations(tableId, rowId) : listAnnotations(tableId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, table_id, row_id, column_name, note } = body;
  if (!project_id || !table_id || !note) {
    return NextResponse.json({ error: "project_id, table_id, note required" }, { status: 400 });
  }
  try {
    const ann = upsertAnnotation(null, { project_id, table_id, row_id, column_name, note });
    return NextResponse.json(ann, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    deleteAnnotation(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
