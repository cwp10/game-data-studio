import { NextRequest, NextResponse } from "next/server";
import { bulkDeleteRows, deleteRow, readRows, upsertRow } from "@/lib/db/repo/rows";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("table_id");
  if (!tableId) return NextResponse.json({ error: "table_id required" }, { status: 400 });
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 1000);
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  return NextResponse.json(readRows(tableId, { limit, offset }));
}

export async function POST(req: NextRequest) {
  const { table_id, id, data } = await req.json();
  return NextResponse.json(upsertRow(table_id, id, data), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (body.row_ids && Array.isArray(body.row_ids)) {
    bulkDeleteRows(body.row_ids);
    return NextResponse.json({ deleted: body.row_ids.length });
  }
  deleteRow(body.row_id);
  return NextResponse.json({ deleted: true });
}
