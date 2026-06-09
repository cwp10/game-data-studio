import { NextRequest, NextResponse } from "next/server";
import { addColumn, listColumns, removeColumn } from "@/lib/db/repo/columns";

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

export async function DELETE(req: NextRequest) {
  const { column_id } = await req.json();
  removeColumn(column_id);
  return NextResponse.json({ deleted: true });
}
