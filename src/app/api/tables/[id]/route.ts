import { NextRequest, NextResponse } from "next/server";
import { deleteTable, getTable } from "@/lib/db/repo/tables";
import { listColumns } from "@/lib/db/repo/columns";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const table = getTable(id);
  if (!table) return NextResponse.json({ error: "not found" }, { status: 404 });
  const columns = listColumns(id);
  return NextResponse.json({ table, columns });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTable(id);
  return NextResponse.json({ deleted: true });
}
